/**
 * Specifies functions for retrieving and processing experimental materials.
 */

/**
 * @param experiment name of the experiment
 * @param materials_hash optional hashcode referring to the materials version to
 *                       be used. by default the latest materials are used.
 */
export async function get_trials(experiment, materials_hash) {
  const resp = await fetch(`/trials/${experiment}`, {
    uniqueId: "", // TODO reintegrate with psiturk -- uniqueId,
    materials: materials_hash
  });
  const materials = await resp.json();

  // TODO process?

  return materials;
}
