/**
 * Specifies functions for retrieving and processing experimental materials.
 */

/**
 * @param experiment name of the experiment
 * @param materials_hash optional hashcode referring to the materials version to
 *                       be used. by default the latest materials are used.
 */
export async function get_trials(experiment, materials_hash, extra_args = {}) {
  const resp = await fetch(`/trials/${experiment}?` + new URLSearchParams({
    ...extra_args,
    uniqueId: window.uniqueId,
    materials: materials_hash
  }));
  const materials = await resp.json();

  // TODO process?

  return materials;
}
