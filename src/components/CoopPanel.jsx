import React, { useState } from 'react';
import './CoopPanel.css';

const CoopPanel = ({
  status,
  roomCode,
  partner,
  error,
  isInRoom,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
}) => {
  const [joinCode, setJoinCode] = useState('');
  const [expanded, setExpanded] = useState(false);

  const partnerLabel = partner?.name || partner?.address?.slice(0, 8) || 'Partner';

  const handleJoin = (e) => {
    e.preventDefault();
    onJoinRoom(joinCode);
  };

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode);
    }
  };

  return (
    <div className={`coop-panel${expanded ? ' coop-panel--expanded' : ''}`}>
      <button
        type="button"
        className={`compact-btn coop-panel__toggle hover:!text-[#FDB913] !mx-0 !my-0 !px-3 !py-1${
          isInRoom || expanded ? ' compact-btn--active' : ''
        }`}
        onClick={() => setExpanded((v) => !v)}
        title="Co-op multiplayer"
      >
        {isInRoom ? `CO-OP · ${roomCode}` : 'CO-OP'}
      </button>

      {expanded && (
        <div className="coop-panel__body">
          {!isInRoom ? (
            <>
              <p className="coop-panel__hint">
                Invite a friend into your bunker. Both pilots share the same sector and see each other move.
              </p>
              <button
                type="button"
                className="compact-btn coop-panel__btn coop-panel__btn--block hover:!text-[#FDB913] !mx-0 !my-0 !px-3 !py-1"
                onClick={onCreateRoom}
              >
                Create Room
              </button>
              <form className="coop-panel__join" onSubmit={handleJoin}>
                <input
                  type="text"
                  className="coop-panel__input"
                  placeholder="Room code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="submit"
                  className="compact-btn coop-panel__btn hover:!text-[#FDB913] !mx-0 !my-0 !px-3 !py-1"
                >
                  Join
                </button>
              </form>
              {status === 'connecting' && <p className="coop-panel__status">Connecting…</p>}
            </>
          ) : (
            <>
              <div className="coop-panel__room">
                <span className="coop-panel__label">Room</span>
                <button
                  type="button"
                  className="compact-btn coop-panel__code hover:!text-[#FDB913] !mx-0 !my-0 !px-3 !py-1 font-mono"
                  onClick={handleCopyCode}
                  title="Copy room code"
                >
                  {roomCode}
                </button>
              </div>
              <p className="coop-panel__status">
                {partner ? `${partnerLabel} is in the bunker` : 'Waiting for partner…'}
              </p>
              <p className="coop-panel__status coop-panel__status--muted">
                Live on defitestnet relay
              </p>
              <button
                type="button"
                className="compact-btn coop-panel__btn coop-panel__btn--block !text-red-400 hover:!text-red-300 !border-red-800/60 hover:!bg-red-950/50 !mx-0 !my-0 !px-3 !py-1"
                onClick={onLeaveRoom}
              >
                Leave Room
              </button>
            </>
          )}
          {error && <p className="coop-panel__error">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default CoopPanel;