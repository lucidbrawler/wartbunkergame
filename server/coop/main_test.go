package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestCoopRoomFlow(t *testing.T) {
	hub := newHub()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		serveWS(hub, w, r)
	}))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	hostConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("host dial: %v", err)
	}
	defer hostConn.Close()

	if err := hostConn.WriteJSON(Message{Type: "create", Player: &PlayerState{Name: "Host"}}); err != nil {
		t.Fatalf("host create: %v", err)
	}

	var created Message
	if err := hostConn.ReadJSON(&created); err != nil {
		t.Fatalf("host read created: %v", err)
	}
	if created.Type != "room_created" || len(created.Code) != 6 {
		t.Fatalf("unexpected create response: %+v", created)
	}

	guestConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("guest dial: %v", err)
	}
	defer guestConn.Close()

	if err := guestConn.WriteJSON(Message{Type: "join", Code: created.Code, Player: &PlayerState{Name: "Guest"}}); err != nil {
		t.Fatalf("guest join: %v", err)
	}

	var joined Message
	if err := guestConn.ReadJSON(&joined); err != nil {
		t.Fatalf("guest read joined: %v", err)
	}
	if joined.Type != "joined" {
		t.Fatalf("unexpected join response: %+v", joined)
	}

	var partnerJoined Message
	if err := hostConn.ReadJSON(&partnerJoined); err != nil {
		t.Fatalf("host read partner joined: %v", err)
	}
	if partnerJoined.Type != "partner_joined" {
		t.Fatalf("unexpected partner joined: %+v", partnerJoined)
	}

	if err := guestConn.WriteJSON(Message{
		Type:   "state",
		Player: &PlayerState{X: 42, Y: 84, Room: 1, Screen: "main"},
	}); err != nil {
		t.Fatalf("guest state: %v", err)
	}

	hostConn.SetReadDeadline(time.Now().Add(2 * time.Second))
	var partnerState Message
	if err := hostConn.ReadJSON(&partnerState); err != nil {
		t.Fatalf("host read partner state: %v", err)
	}
	if partnerState.Type != "partner_state" || partnerState.Player == nil || partnerState.Player.X != 42 {
		raw, _ := json.Marshal(partnerState)
		t.Fatalf("unexpected partner state: %s", raw)
	}
}