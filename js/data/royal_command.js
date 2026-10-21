// These ratings are gameplay assessments, not historical measurements.
// Link only a named commander already authored into a bookmark's army roster.
// Source references follow the historical casts used by the existing content.
export const HISTORICAL_COMMAND_RATINGS = {
  '167bce': {
    'Judah Maccabee': { fire: 3, shock: 4, maneuver: 4,
      note: '1 Maccabees 3–4 and 9: command of the revolt and its campaigns. Three stars represent the game assessment of his battlefield record.' },
  },
  '132ce': {
    'Simon bar Kosiba': { fire: 3, shock: 4, maneuver: 4,
      note: 'Cassius Dio, Roman History 69.12–14, and the Bar Kokhba letters: military leadership of the revolt. The numerical skills are a game interpretation.' },
  },
  '351ce': {
    'Shapur II': { fire: 3, shock: 4, maneuver: 4,
      note: 'Ammianus Marcellinus, Res Gestae 18–20: the Persian king’s eastern campaigns. Three stars are a game assessment, not a rating supplied by the source.' },
  },
};

export const ROYAL_COMMAND_ALIASES = { '351ce': { Gallus: 'Gallus Caesar' } };

export const ROYAL_COMMAND_RISK = Object.freeze({ camp: .001, campaign: .003, battle: .001, destroyed: .2 });
export const ROYAL_COMMAND_WARNING = 'Field command costs no monarch points. Skills are rolled once per person and persist after recall. Additional mortality: 0.1% per month in a home camp, 0.3% per month on campaign, 0.1% per battle day, and a 20% death risk if the army is destroyed. A ruler’s death triggers succession; an heir’s death removes the designated heir. Recall requires a stationary army in controlled home territory.';
