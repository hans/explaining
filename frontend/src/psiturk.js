const PsiTurk = window.PsiTurk;

const uniqueId = window.uniqueId;
const adServerLoc = window.adServerLoc;
const mode = window.mode;

export const psiturk = new PsiTurk(uniqueId, adServerLoc, mode);


export async function default_on_finish() {
  psiturk.saveData({
    success: () => psiturk.completeHIT(),
    error: () => console.log("error saving data"),
  });
}


export async function default_on_data_update(data) {
  psiturk.recordTrialData(data);
}
