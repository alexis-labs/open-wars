'use client';

import Button from '@deities/ui/Button.tsx';
import { css, cx } from '@emotion/css';
import { useCallback, useState } from 'react';
import PlaygroundDemoGame from './PlaygroundDemoGame.tsx';

type Screen = 'menu' | 'options' | 'playing';

export default function PlaygroundMainMenu() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [exitMessage, setExitMessage] = useState<string | null>(null);
  const [fullscreenMessage, setFullscreenMessage] = useState<string | null>(null);

  const play = useCallback(() => {
    setExitMessage(null);
    setScreen('playing');
  }, []);

  const showOptions = useCallback(() => {
    setExitMessage(null);
    setFullscreenMessage(null);
    setScreen('options');
  }, []);

  const backToMenu = useCallback(() => {
    setFullscreenMessage(null);
    setScreen('menu');
  }, []);

  const exit = useCallback(() => {
    setExitMessage(null);
    window.close();
    window.setTimeout(() => {
      setExitMessage('Your browser blocked closing this tab. You can close it manually.');
    }, 250);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setFullscreenMessage(null);

    if (!document.fullscreenEnabled) {
      setFullscreenMessage('Fullscreen is not available in this browser.');
      return;
    }

    const request = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();

    request.catch(() => {
      setFullscreenMessage('Fullscreen could not be changed.');
    });
  }, []);

  if (screen === 'playing') {
    return <PlaygroundDemoGame />;
  }

  return (
    <section className={menuShell}>
      <div className={menuPanel}>
        <p className={eyebrow}>Open Wars</p>
        <h2 className={title}>{screen === 'options' ? 'Options' : 'Main Menu'}</h2>

        {screen === 'options' ? (
          <>
            <div className={optionsList}>
              <div className={optionRow}>
                <span>Volume</span>
                <span className={muted}>Coming soon</span>
              </div>
              <div className={optionRow}>
                <span>Fullscreen</span>
                <Button className={smallButton} onClick={toggleFullscreen}>
                  Toggle
                </Button>
              </div>
            </div>
            {fullscreenMessage ? <p className={statusMessage}>{fullscreenMessage}</p> : null}
            <Button className={menuButton} onClick={backToMenu}>
              Back
            </Button>
          </>
        ) : (
          <>
            <div className={buttonStack}>
              <Button className={menuButton} onClick={play}>
                Play
              </Button>
              <Button className={menuButton} onClick={showOptions}>
                Options
              </Button>
              <Button className={cx(menuButton, exitButton)} onClick={exit}>
                Exit
              </Button>
            </div>
            {exitMessage ? <p className={statusMessage}>{exitMessage}</p> : null}
          </>
        )}
      </div>
    </section>
  );
}

const menuShell = css`
  align-items: center;
  background:
    linear-gradient(180deg, rgba(18, 24, 34, 0.68), rgba(18, 24, 34, 0.36)),
    linear-gradient(135deg, #263c55, #536f6f);
  box-sizing: border-box;
  display: flex;
  justify-content: center;
  margin: 24px auto;
  max-width: 960px;
  min-height: min(560px, 72vh);
  overflow: hidden;
  padding: 24px;
  width: 100%;
`;

const menuPanel = css`
  align-items: stretch;
  background: rgba(248, 250, 244, 0.92);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.28);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 360px;
  padding: 28px;
  text-align: center;
  width: min(100%, 360px);
`;

const eyebrow = css`
  color: #586575;
  font-family: Athena, var(--vocs-font-family);
  font-size: 18px;
  margin: 0;
  text-transform: uppercase;
`;

const title = css`
  color: #1f2933;
  font-family: Athena, var(--vocs-font-family);
  font-size: 42px;
  line-height: 1;
  margin: 0;
`;

const buttonStack = css`
  display: grid;
  gap: 12px;
`;

const menuButton = css`
  box-sizing: border-box;
  font-size: 18px;
  justify-content: center;
  min-height: 56px;
  width: 100%;
`;

const exitButton = css`
  color: #8f2f2f;
`;

const optionsList = css`
  display: grid;
  gap: 12px;
`;

const optionRow = css`
  align-items: center;
  background: rgba(255, 255, 255, 0.58);
  box-sizing: border-box;
  color: #1f2933;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  min-height: 52px;
  padding: 8px 12px;
  text-align: left;
`;

const muted = css`
  color: #697889;
  font-size: 14px;
`;

const smallButton = css`
  font-size: 14px;
  min-height: 36px;
`;

const statusMessage = css`
  color: #586575;
  font-size: 14px;
  line-height: 1.4;
  margin: 0;
`;
