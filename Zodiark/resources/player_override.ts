import { Lang } from '../resources/languages';
import { Party, PlayerChangedRet } from '../types/event';
import { Job } from '../types/job';

import { addOverlayListener } from './overlay_plugin_api';
import Util from './util';

// Will redirect calls from `onPlayerChangedEvent` to |func| overriding with
// |playerName| and their job.  Job is important for raidboss.
// It might be nice to do HP, because otherwise the math section of
// Ridorana Lighthouse won't work.
//
// Other parts of the player (such that would help the jobs overlay run)
// are deliberately not included here, because it's impossible to run
// jobs remotely due to gauge data being local and many bits of information
// loaded from memory.

export type PlayerChangedDetail = { detail: PlayerChangedRet };
type PlayerChangedFunc = (e: PlayerChangedDetail) => void;

// @TODO: Swap the order of these arguments, make playerName optional instead
export const addPlayerChangedOverrideListener = (
  func: PlayerChangedFunc,
  playerName?: string,
): void => {
  if (!func)
    return;

  let lastPlayerChangedEvent: PlayerChangedDetail | null = null;
  let lastPlayerJob: Job | null = null;

  const onPlayerChanged: PlayerChangedFunc = (e: PlayerChangedDetail) => {
    if (playerName) {
      e.detail.name = playerName;
      if (lastPlayerJob) {
        // Use the non-overridden job if we don't know an overridden one.
        e.detail.job = lastPlayerJob;
      }
    }
    lastPlayerChangedEvent = e;

    func(e);
  };

  addOverlayListener('onPlayerChangedEvent', onPlayerChanged);
  if (!playerName)
    return;

  addOverlayListener('PartyChanged', (e) => {
    const player = e.party.find((p) => p.name === playerName);
    if (!player)
      return;

    const newJob = Util.jobEnumToJob(player.job);
    if (newJob === lastPlayerJob)
      return;

    lastPlayerJob = newJob;
    // This event may come before the first onPlayerChangedEvent.
    if (lastPlayerChangedEvent)
      onPlayerChanged(lastPlayerChangedEvent);
  });
};

// Common UI for selecting a player.
// Only used for raidboss, but could ostensibly be reused for oopsy,
// if there's ever player specific stuff.
// TODO: it would be nice to show the "connected / not connected" bit in the UI.
export const addRemotePlayerSelectUI = (lang: Lang): void => {
  const instructionTextByLang = {
    en: 'Select a Player\n(the list will update when in an instance)',
    de: 'W??hle einen Spieler\n(Diese Liste aktualisiert sich, sobald eine Instance betretten wird)',
    fr: 'S??lectionner un joueur\n (la liste se mettra ?? jour dans une instance)',
    ja: '?????????????????????????????????????????????\n(??????????????????????????????????????????????????????)',
    cn: '?????????????????????\n(???????????????????????????????????????)',
    ko: '??????????????? ???????????????\n(??????????????? ????????? ???????????? ?????????????????????.)',
  };
  const forceTTSByLang = {
    en: 'Force Enable Text To Speech',
    de: 'Erzwinge Text in Sprache (TTS)',
    fr: 'Forcer l\'activation de la synth??se vocale (TTS)',
    ja: 'TTS??????????????????????????????',
    cn: '????????????TTS',
    ko: 'TTS ????????? ???????????????',
  };
  const buttonTextByLang = {
    en: 'Start Overlay',
    de: 'Start Overlay',
    fr: 'D??marrer l\'Overlay',
    ja: '???????????????????????????',
    cn: '???????????????',
    ko: '???????????? ??????',
  };
  const defaultTextByLang = {
    en: '(no override)',
    de: '(kein ??berschreiben)',
    fr: '(pas de d??rogation)',
    ja: '(?????????)',
    cn: '(?????????)',
    ko: '(???????????? ?????? ??????)',
  };

  // TODO: probably should save forceTTS as well, maybe save some {} options?
  const kStorageKey = 'cactbot-last-selected-player';
  const savePlayerName = (name: string) => {
    window.localStorage.setItem(kStorageKey, name);
  };
  const loadPlayerName = () => {
    return window.localStorage.getItem(kStorageKey);
  };

  // Add common UI to select a player.
  const container = document.createElement('div');
  container.id = 'player-select';
  document.body.appendChild(container);

  const instructionElem = document.createElement('div');
  instructionElem.id = 'player-select-instructions';
  instructionElem.innerHTML = instructionTextByLang[lang] || instructionTextByLang['en'];
  container.appendChild(instructionElem);

  const listElem = document.createElement('div');
  listElem.id = 'player-select-list';
  container.appendChild(listElem);

  const ttsElem = document.createElement('input');
  ttsElem.type = 'checkbox';
  ttsElem.id = 'player-select-tts';
  ttsElem.name = 'player-select-tts';
  container.appendChild(ttsElem);

  const ttsLabel = document.createElement('label');
  ttsLabel.id = 'player-select-tts-label';
  ttsLabel.htmlFor = 'player-select-tts';
  ttsLabel.innerHTML = forceTTSByLang[lang] || forceTTSByLang['en'];
  container.appendChild(ttsLabel);

  const buttonElem = document.createElement('button');
  buttonElem.id = 'player-select-button';
  buttonElem.name = 'player-select-button';
  buttonElem.innerHTML = buttonTextByLang[lang] || buttonTextByLang['en'];
  container.appendChild(buttonElem);
  buttonElem.addEventListener('click', () => {
    const forceTTS = ttsElem.checked;
    let playerName = '';
    let radioIndex = 0;
    for (;;) {
      radioIndex++;
      const elem = document.getElementById(`player-radio-${radioIndex}`);
      if (!elem || !(elem instanceof HTMLInputElement))
        break;
      if (!elem.checked)
        continue;
      playerName = elem.value;
      break;
    }

    if (playerName)
      savePlayerName(playerName);

    // Preserve existing parameters.
    const currentParams = new URLSearchParams(window.location.search);
    const paramMap: { [value: string]: number | string } = {};
    // Yes, this is (v, k) and not (k, v).
    currentParams.forEach((v, k) => paramMap[k] = decodeURIComponent(v));

    paramMap.player = playerName;
    // Use 1/0 to be consistent with other query parameters rather than string true/false.
    paramMap.forceTTS = forceTTS ? 1 : 0;

    // TODO: overlay_plugin_api.js doesn't support uri encoded OVERLAY_WS parameters.
    // So this can't use URLSearchParams.toString yet.  Manually build string.
    let search = '?';
    for (const [k, v] of Object.entries(paramMap))
      search += `${k}=${v}&`;

    // Reload the page with more options.
    window.location.search = search;
  });

  const lastSelectedPlayer = loadPlayerName();

  const buildList = (party: Party[]) => {
    while (listElem.firstChild) {
      if (listElem.lastChild)
        listElem.removeChild(listElem.lastChild);
    }

    let radioCount = 0;

    const addRadio = (name: string, value: string, extraClass: string) => {
      radioCount++;

      const inputName = `player-radio-${radioCount}`;

      const inputElem = document.createElement('input');
      inputElem.type = 'radio';
      inputElem.value = value;
      inputElem.id = inputName;
      inputElem.name = 'player-radio';
      inputElem.classList.add('player-radio', extraClass);
      listElem.appendChild(inputElem);

      const labelElem = document.createElement('label');
      labelElem.htmlFor = inputName;
      labelElem.innerHTML = name;
      listElem.appendChild(labelElem);

      return inputElem;
    };

    const defaultText = defaultTextByLang[lang] || defaultTextByLang['en'];
    const defaultElem = addRadio(defaultText, '', 'player-radio-default');
    defaultElem.checked = true;

    if (lastSelectedPlayer) {
      const last = addRadio(lastSelectedPlayer, lastSelectedPlayer, 'player-radio-last');
      last.checked = true;
    }

    const partyPlayers = party.filter((p) => p.inParty && p.name !== lastSelectedPlayer);
    const partyNames = partyPlayers.map((p) => p.name).sort();
    for (const name of partyNames)
      addRadio(name, name, 'player-radio-party');

    const alliancePlayers = party.filter((p) => !p.inParty && p.name !== lastSelectedPlayer);
    const allianceNames = alliancePlayers.map((p) => p.name).sort();
    for (const name of allianceNames)
      addRadio(name, name, 'player-radio-alliance');
  };
  addOverlayListener('PartyChanged', (e) => {
    buildList(e.party);
  });
  buildList([]);
};
