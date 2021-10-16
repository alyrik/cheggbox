import React from 'react';
import ReactDOM from 'react-dom';
import anime from 'animejs';

import './index.scss';

enum CheckboxName {
  First,
  Second,
  Third,
}

const AppContext = React.createContext({});

const PROJECTILE_WIDTH = 15;
const BIRD_WIDTH = 150;
const CHECKBOX_BORDER_WIDTH = 2;
const MIN_WINDOW_WIDTH = 1200;
const BROKEN_EGG_WIDTH = 100;
const BODY_PADDING = 20;
const INITIAL_DURATION = 3500;
const LEVEL_DURATION_STEP = 1200;
const MAX_LEVEL = 2;
const MAX_SHIT_LEVEL = 75;
const SHIT_LEVEL_STEP = 1.5;
const BIRD_REVERSED_CLASS = 'bird--reversed';
const BIRD_CLICKED_CLASS = 'bird--clicked';
const PROJECTILE_ALTERNATIVE_CLASS = 'shit--alternative';

let clickTimeout;
let birdAnimation;
let level = 0;
let clickListener;
let lastProjectile;
let startTime;

function startBirdAnimation({ $bird, currentLevel }) {
  const windowWidth = window.innerWidth;
  birdAnimation = anime({
    targets: $bird,
    translateX: $bird.classList.contains(BIRD_REVERSED_CLASS)
      ? 0
      : Math.max(windowWidth, MIN_WINDOW_WIDTH) - BIRD_WIDTH - BODY_PADDING,
    duration: INITIAL_DURATION - currentLevel * LEVEL_DURATION_STEP,
    loop: true,
    direction: 'alternate',
    easing: 'linear',
    loopComplete: (anim) => {
      $bird.classList.toggle(BIRD_REVERSED_CLASS);

      if (currentLevel !== level) {
        birdAnimation.remove($bird);
        startBirdAnimation({ $bird, currentLevel: Math.min(level, MAX_LEVEL) });
      }
    },
  });
}

function handleClick({
  $bird,
  $boxes,
  getCheckboxValues,
  setCheckboxValues,
  getShitLevel,
  incrementShitLevel,
  showGameOver,
  showWinner,
  setScore,
}) {
  const checkboxValues = getCheckboxValues();
  const { left, bottom } = $bird.getBoundingClientRect();
  const projectilePositionLeft =
    left + BIRD_WIDTH / 2 + ($bird.classList.contains(BIRD_REVERSED_CLASS) ? 25 : -35);
  const projectilePositionTop = bottom - 30;

  const boxRanges = Array.from($boxes).reduce((result, $box: any) => {
    const { left, right, bottom } = $box.getBoundingClientRect();

    return [...(result as any), [left, right, bottom]];
  }, []) as any;
  const matchingIndex = boxRanges.findIndex(
    ([boxLeft, boxRight]) =>
      projectilePositionLeft > boxLeft && projectilePositionLeft < boxRight - PROJECTILE_WIDTH,
  );
  const isEgg = matchingIndex > -1;
  const hasEggAlready = isEgg && checkboxValues[matchingIndex];

  const $projectile = document.createElement('div');
  $projectile.classList.add(isEgg ? 'egg' : 'shit');
  $projectile.style.left = projectilePositionLeft + 'px';
  $projectile.style.top = projectilePositionTop + 'px';

  if (!isEgg && Math.round(projectilePositionLeft) % 2 === 0) {
    $projectile.classList.add(PROJECTILE_ALTERNATIVE_CLASS);
  }

  document.body.appendChild($projectile);
  lastProjectile = $projectile;

  if (isEgg && !hasEggAlready) {
    setCheckboxValues({ [matchingIndex]: $projectile });
  }

  clearTimeout(clickTimeout);
  $bird.classList.add(BIRD_CLICKED_CLASS);
  clickTimeout = setTimeout(() => {
    $bird.classList.remove(BIRD_CLICKED_CLASS);
  }, 300);

  const windowHeight = window.innerHeight;
  const projectileTargetPosition = isEgg
    ? boxRanges[0][2] - bottom - CHECKBOX_BORDER_WIDTH + BODY_PADDING / 2
    : windowHeight - bottom - $projectile.offsetHeight / 2;

  anime({
    targets: $projectile,
    translateY: projectileTargetPosition,
    duration: isEgg && !hasEggAlready ? 1500 : 1000,
    easing: isEgg && !hasEggAlready ? 'easeOutBounce' : 'easeInQuad',
    begin: () => {
      if (isEgg) {
        hasEggAlready ? (level -= 1) : (level += 1);
      }
    },
    complete: () => {
      if (level > MAX_LEVEL && lastProjectile === $projectile) {
        document.removeEventListener('click', clickListener);
        setScore(Date.now() - startTime);
        showWinner();
        return;
      }

      if (isEgg) {
        if (hasEggAlready) {
          const $brokenEgg = document.createElement('div');
          $brokenEgg.classList.add('broken-egg');
          $brokenEgg.style.left = projectilePositionLeft - BROKEN_EGG_WIDTH / 2 + 'px';
          $brokenEgg.style.top =
            checkboxValues[matchingIndex].getBoundingClientRect().top - BROKEN_EGG_WIDTH / 2 + 'px';
          document.body.appendChild($brokenEgg);
          document.body.removeChild(checkboxValues[matchingIndex]);
          document.body.removeChild($projectile);
          setCheckboxValues({ [matchingIndex]: null });
        }
      } else {
        document.body.removeChild($projectile);

        if (getShitLevel() > MAX_SHIT_LEVEL) {
          document.removeEventListener('click', clickListener);
          incrementShitLevel(windowHeight);
          showGameOver();
        } else {
          incrementShitLevel();
        }
      }
    },
  });
}

function addListeners({
  $bird,
  $boxes,
  getCheckboxValues,
  setCheckboxValues,
  getShitLevel,
  incrementShitLevel,
  showGameOver,
  showWinner,
  setScore,
}) {
  document.addEventListener(
    'click',
    (clickListener = (e) => {
      e.preventDefault();
      handleClick({
        $bird,
        $boxes,
        getCheckboxValues,
        setCheckboxValues,
        getShitLevel,
        incrementShitLevel,
        showGameOver,
        showWinner,
        setScore,
      });
    }),
  );
}

const ShitLayer = () => {
  const { getShitLevel } = React.useContext(AppContext) as any;
  const height = `${getShitLevel()}px`;

  return <div className="shit-layer" style={{ height }} />;
};

const Bird = () => {
  return <div className="bird" />;
};

const Checkbox = ({ name, checked }) => {
  return (
    <label className="checkbox">
      <input type="checkbox" className="checkbox__input" name={name} checked={checked} />
      <span className="checkbox__box" />
      <span className="checkbox__text">{checked ? 'I AM CHEGGED!!!' : 'Chegg me please!'}</span>
    </label>
  );
};

const BirdContainer = () => {
  const {
    getCheckboxValues,
    setCheckboxValues,
    getShitLevel,
    incrementShitLevel,
    showGameOver,
    showWinner,
    setScore,
  } = React.useContext(AppContext) as any;
  React.useEffect(() => {
    startTime = Date.now();
    const $bird = document.querySelector('.bird');
    const $boxes = document.querySelectorAll('.checkbox__box');
    startBirdAnimation({ $bird, currentLevel: level });
    addListeners({
      $bird,
      $boxes,
      getCheckboxValues,
      setCheckboxValues,
      getShitLevel,
      incrementShitLevel,
      showGameOver,
      showWinner,
      setScore,
    });
  }, []);

  return (
    <div className="bird-container">
      <Bird />
    </div>
  );
};

const ControlsContainer = () => {
  const { getCheckboxValues } = React.useContext(AppContext) as any;
  const checkboxValues = getCheckboxValues();

  return (
    <div className="controls-container">
      <div className="controls-container__item">
        <Checkbox name={CheckboxName.First} checked={Boolean(checkboxValues[CheckboxName.First])} />
      </div>
      <div className="controls-container__item">
        <Checkbox
          name={CheckboxName.Second}
          checked={Boolean(checkboxValues[CheckboxName.Second])}
        />
      </div>
      <div className="controls-container__item">
        <Checkbox name={CheckboxName.Third} checked={Boolean(checkboxValues[CheckboxName.Third])} />
      </div>
    </div>
  );
};

const GameOver = () => {
  return (
    <div className="game-over">
      <div className="game-over__content">
        <span>W</span>
        <span>A</span>
        <span>S</span>
        <span>T</span>
        <span>E</span>
        <span>D</span>
      </div>
    </div>
  );
};

const Winner = ({ score }) => {
  return (
    <div className="winner">
      <div className="winner__cover" />
      <h1 className="winner__title">Winner!</h1>
      <div className="winner__text">
        You've managed to select all cheggboxes in {score} seconds!
      </div>
    </div>
  );
};

const App = () => {
  const [values, setValues] = React.useState({
    [CheckboxName.First]: null,
    [CheckboxName.Second]: null,
    [CheckboxName.Third]: null,
  });
  const [shitLevel, setShitLevel] = React.useState(0);
  const [isGameOverShown, setIsGameOverShown] = React.useState(false);
  const [isWinnerShown, setIsWinnerShown] = React.useState(false);
  const [score, setScore] = React.useState(0);
  const valuesRef = React.useRef();
  const shitLevelRef = React.useRef();
  valuesRef.current = values as any;
  shitLevelRef.current = shitLevel as any;

  return (
    <AppContext.Provider
      value={{
        getCheckboxValues: () => valuesRef.current,
        setCheckboxValues: (nextValues) => {
          setValues((values) => ({ ...values, ...nextValues }));
        },
        getShitLevel: () => shitLevelRef.current,
        incrementShitLevel: (nextLevel) => {
          setShitLevel((currentShitLevel) => nextLevel ?? currentShitLevel + SHIT_LEVEL_STEP);
        },
        showGameOver: () => setIsGameOverShown(true),
        showWinner: () => setIsWinnerShown(true),
        setScore: (value) => setScore(Math.round(value / 1000)),
      }}>
      <ShitLayer />
      <BirdContainer />
      <ControlsContainer />
      {isGameOverShown && <GameOver />}
      {isWinnerShown && <Winner score={score} />}
      <div className="min-height">Please make this window higher — min 400px</div>
    </AppContext.Provider>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
