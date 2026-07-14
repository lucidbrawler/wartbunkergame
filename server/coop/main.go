package main

import (
	"context"
	"encoding/json"
	"log"
	"math/rand"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gorilla/websocket"
)

const (
	maxPlayersPerRoom = 2
	defaultPort       = "8765"
	defaultBind       = "127.0.0.1"
)

var allowedOrigins = parseAllowedOrigins(os.Getenv("COOP_ALLOWED_ORIGINS"))

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     checkOrigin,
}

type PlayerState struct {
	ID       string  `json:"id"`
	Name     string  `json:"name,omitempty"`
	Address  string  `json:"address,omitempty"`
	X        float64 `json:"x"`
	Y        float64 `json:"y"`
	Room     int     `json:"room"`
	Screen   string  `json:"screen"`
	Boosting bool    `json:"boosting,omitempty"`
}

type Message struct {
	Type    string        `json:"type"`
	Code    string        `json:"code,omitempty"`
	Player  *PlayerState  `json:"player,omitempty"`
	Players []PlayerState `json:"players,omitempty"`
	Error   string        `json:"error,omitempty"`
}

type HealthResponse struct {
	OK         bool `json:"ok"`
	Rooms      int  `json:"rooms"`
	Players    int  `json:"players"`
	MaxPlayers int  `json:"maxPlayersPerRoom"`
}

type Client struct {
	id     string
	room   *Room
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	state  PlayerState
	closed bool
	mu     sync.Mutex
	once   sync.Once
}

type Room struct {
	code    string
	clients map[string]*Client
	mu      sync.RWMutex
}

type Hub struct {
	rooms map[string]*Room
	mu    sync.RWMutex
}

func parseAllowedOrigins(raw string) map[string]struct{} {
	defaults := []string{
		"https://warthog-defitestnet.duckdns.org",
		"https://warthognode.duckdns.org",
		"https://astohogdev.netlify.app",
		"https://tubular-pegasus-c3a1e3.netlify.app",
		"http://localhost:4321",
		"http://localhost:5173",
		"http://127.0.0.1:4321",
	}
	origins := make(map[string]struct{})
	for _, origin := range defaults {
		origins[strings.TrimSpace(origin)] = struct{}{}
	}
	for _, origin := range strings.Split(raw, ",") {
		origin = strings.TrimSpace(origin)
		if origin != "" {
			origins[origin] = struct{}{}
		}
	}
	return origins
}

func checkOrigin(r *http.Request) bool {
	if len(allowedOrigins) == 0 {
		return true
	}
	origin := r.Header.Get("Origin")
	if origin == "" {
		// Non-browser clients and some proxies omit Origin.
		return true
	}
	if _, ok := allowedOrigins[origin]; ok {
		return true
	}
	// Allow any Netlify preview/deploy URL when explicitly enabled.
	if strings.HasSuffix(origin, ".netlify.app") {
		return true
	}
	log.Printf("rejected origin: %s", origin)
	return false
}

func newHub() *Hub {
	return &Hub{rooms: make(map[string]*Room)}
}

func (h *Hub) getOrCreateRoom(code string) *Room {
	h.mu.Lock()
	defer h.mu.Unlock()
	if room, ok := h.rooms[code]; ok {
		return room
	}
	room := &Room{code: code, clients: make(map[string]*Client)}
	h.rooms[code] = room
	return room
}

func (h *Hub) removeRoom(code string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.rooms, code)
}

func (h *Hub) stats() (rooms int, players int) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	rooms = len(h.rooms)
	for _, room := range h.rooms {
		players += room.playerCount()
	}
	return rooms, players
}

func (r *Room) playerCount() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.clients)
}

func (r *Room) addClient(c *Client) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.clients) >= maxPlayersPerRoom {
		return false
	}
	r.clients[c.id] = c
	return true
}

func (r *Room) removeClient(id string) *Client {
	r.mu.Lock()
	defer r.mu.Unlock()
	c, ok := r.clients[id]
	if ok {
		delete(r.clients, id)
	}
	return c
}

func (r *Room) otherClients(id string) []*Client {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]*Client, 0, len(r.clients)-1)
	for cid, c := range r.clients {
		if cid != id {
			out = append(out, c)
		}
	}
	return out
}

func (r *Room) allStates() []PlayerState {
	r.mu.RLock()
	defer r.mu.RUnlock()
	out := make([]PlayerState, 0, len(r.clients))
	for _, c := range r.clients {
		out = append(out, c.state)
	}
	return out
}

func generateRoomCode() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	for i := range b {
		b[i] = chars[rand.Intn(len(chars))]
	}
	return string(b)
}

func generateClientID() string {
	return generateRoomCode()[:3] + generateRoomCode()[3:]
}

func (c *Client) sendJSON(msg Message) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}
	select {
	case c.send <- data:
	default:
	}
}

func (c *Client) broadcastToPartners(msg Message) {
	if c.room == nil {
		return
	}
	for _, partner := range c.room.otherClients(c.id) {
		partner.sendJSON(msg)
	}
}

func (c *Client) readPump() {
	defer c.close()

	c.conn.SetReadLimit(4096)
	_ = c.conn.SetReadDeadline(time.Now().Add(90 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		return c.conn.SetReadDeadline(time.Now().Add(90 * time.Second))
	})

	for {
		_, data, err := c.conn.ReadMessage()
		if err != nil {
			break
		}

		var msg Message
		if err := json.Unmarshal(data, &msg); err != nil {
			c.sendJSON(Message{Type: "error", Error: "invalid message"})
			continue
		}

		switch msg.Type {
		case "create":
			c.handleCreate(msg)
		case "join":
			c.handleJoin(msg)
		case "state":
			c.handleState(msg)
		case "leave":
			c.handleLeave()
		case "ping":
			c.sendJSON(Message{Type: "pong"})
		default:
			c.sendJSON(Message{Type: "error", Error: "unknown message type"})
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.close()
	}()

	for {
		select {
		case data, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, data); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *Client) close() {
	c.once.Do(func() {
		c.mu.Lock()
		c.closed = true
		c.mu.Unlock()

		if c.room != nil {
			c.room.removeClient(c.id)
			if c.room.playerCount() == 0 {
				c.hub.removeRoom(c.room.code)
			} else {
				c.broadcastToPartners(Message{Type: "partner_left", Player: &c.state})
			}
		}

		close(c.send)
		_ = c.conn.Close()
	})
}

func (c *Client) handleCreate(msg Message) {
	if c.room != nil {
		c.sendJSON(Message{Type: "error", Error: "already in a room"})
		return
	}

	code := generateRoomCode()
	room := c.hub.getOrCreateRoom(code)
	if !room.addClient(c) {
		c.hub.removeRoom(code)
		c.sendJSON(Message{Type: "error", Error: "could not create room"})
		return
	}

	c.room = room
	c.applyPlayerMeta(msg.Player)
	c.sendJSON(Message{
		Type:   "room_created",
		Code:   code,
		Player: &c.state,
	})
	log.Printf("room %s created by %s", code, c.id)
}

func (c *Client) handleJoin(msg Message) {
	if c.room != nil {
		c.sendJSON(Message{Type: "error", Error: "already in a room"})
		return
	}

	code := strings.ToUpper(strings.TrimSpace(msg.Code))
	if len(code) != 6 {
		c.sendJSON(Message{Type: "error", Error: "invalid room code"})
		return
	}

	c.hub.mu.RLock()
	room, ok := c.hub.rooms[code]
	c.hub.mu.RUnlock()
	if !ok {
		c.sendJSON(Message{Type: "error", Error: "room not found"})
		return
	}

	if !room.addClient(c) {
		c.sendJSON(Message{Type: "error", Error: "room is full"})
		return
	}

	c.room = room
	c.applyPlayerMeta(msg.Player)

	c.sendJSON(Message{
		Type:    "joined",
		Code:    code,
		Player:  &c.state,
		Players: room.allStates(),
	})

	c.broadcastToPartners(Message{
		Type:   "partner_joined",
		Player: &c.state,
	})
	log.Printf("client %s joined room %s", c.id, code)
}

func (c *Client) applyPlayerMeta(player *PlayerState) {
	if player == nil {
		c.state.ID = c.id
		return
	}
	if player.Name != "" {
		c.state.Name = player.Name
	}
	if player.Address != "" {
		c.state.Address = player.Address
	}
	c.state.ID = c.id
}

func (c *Client) handleState(msg Message) {
	if c.room == nil || msg.Player == nil {
		return
	}

	c.state.X = msg.Player.X
	c.state.Y = msg.Player.Y
	c.state.Room = msg.Player.Room
	c.state.Screen = msg.Player.Screen
	c.state.Boosting = msg.Player.Boosting

	c.broadcastToPartners(Message{
		Type:   "partner_state",
		Player: &c.state,
	})
}

func (c *Client) handleLeave() {
	c.close()
}

func serveWS(hub *Hub, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("upgrade error: %v", err)
		return
	}

	client := &Client{
		id:   generateClientID(),
		hub:  hub,
		conn: conn,
		send: make(chan []byte, 32),
		state: PlayerState{
			Screen: "main",
		},
	}

	go client.writePump()
	go client.readPump()
}

func main() {
	hub := newHub()

	port := os.Getenv("COOP_PORT")
	if port == "" {
		port = defaultPort
	}
	bind := os.Getenv("COOP_BIND")
	if bind == "" {
		bind = defaultBind
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		rooms, players := hub.stats()
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(HealthResponse{
			OK:         true,
			Rooms:      rooms,
			Players:    players,
			MaxPlayers: maxPlayersPerRoom,
		})
	})
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		serveWS(hub, w, r)
	})

	addr := bind + ":" + port
	server := &http.Server{
		Addr:              addr,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("wart bunker co-op listening on %s (ws path /ws)", addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("shutdown error: %v", err)
	}
	log.Println("co-op server stopped")
}