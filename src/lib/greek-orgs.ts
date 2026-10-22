export const GREEK_ORGS = [
  "Interfraternity Council",
  "Panhellenic Council",
  "National Pan-Hellenic Council",
  "Multicultural Greek Council",
  "Fraternity and Sorority Life",
  "Alpha Chi Omega",
  "Alpha Delta Pi",
  "Alpha Epsilon Phi",
  "Alpha Epsilon Pi",
  "Alpha Gamma Delta",
  "Alpha Gamma Rho",
  "Alpha Kappa Alpha",
  "Alpha Kappa Lambda",
  "Alpha Omicron Pi",
  "Alpha Phi Alpha",
  "Alpha Phi",
  "Alpha Sigma Phi",
  "Alpha Sigma Tau",
  "Alpha Tau Omega",
  "Alpha Xi Delta",
  "Beta Theta Pi",
  "Beta Sigma Psi",
  "Chi Omega",
  "Chi Phi",
  "Chi Psi",
  "Delta Chi",
  "Delta Delta Delta",
  "Delta Gamma",
  "Delta Kappa Epsilon",
  "Delta Phi Epsilon",
  "Delta Sigma Phi",
  "Delta Sigma Theta",
  "Delta Tau Delta",
  "Delta Upsilon",
  "Delta Zeta",
  "FarmHouse",
  "Gamma Phi Beta",
  "Iota Phi Theta",
  "Kappa Alpha Order",
  "Kappa Alpha Psi",
  "Kappa Alpha Theta",
  "Kappa Delta",
  "Kappa Kappa Gamma",
  "Kappa Sigma",
  "Lambda Chi Alpha",
  "Lambda Theta Alpha",
  "Lambda Theta Phi",
  "Omega Psi Phi",
  "Phi Beta Sigma",
  "Phi Delta Theta",
  "Phi Gamma Delta",
  "Phi Kappa Psi",
  "Phi Kappa Tau",
  "Phi Kappa Theta",
  "Phi Mu",
  "Phi Sigma Kappa",
  "Phi Sigma Sigma",
  "Pi Beta Phi",
  "Pi Kappa Alpha",
  "Pi Kappa Phi",
  "Psi Upsilon",
  "Sigma Alpha Epsilon",
  "Sigma Alpha Mu",
  "Sigma Chi",
  "Sigma Delta Tau",
  "Sigma Gamma Rho",
  "Sigma Kappa",
  "Sigma Lambda Gamma",
  "Sigma Nu",
  "Sigma Phi Epsilon",
  "Sigma Pi",
  "Sigma Sigma Sigma",
  "Sigma Tau Gamma",
  "Tau Kappa Epsilon",
  "Theta Chi",
  "Theta Phi Alpha",
  "Theta Xi",
  "Triangle Fraternity",
  "Zeta Beta Tau",
  "Zeta Phi Beta",
  "Zeta Tau Alpha",
].sort((a, b) => b.length - a.length);

const GREEK_LETTERS = new Set(["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", "pi", "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega"]);

export function isGreekOrgName(name: string): boolean {
  const value = name.toLowerCase();
  for (const org of GREEK_ORGS) {
    const needle = org.toLowerCase();
    let from = 0;
    while (from < value.length) {
      const at = value.indexOf(needle, from);
      if (at === -1) break;
      const before = at === 0 ? "" : value[at - 1];
      const after = value.slice(at + needle.length);
      const next = after.match(/^\s+([a-z]+)/);
      const continues = next ? GREEK_LETTERS.has(next[1]) : false;
      if ((before === "" || /[^a-z]/.test(before)) && (after === "" || /^[^a-z]/.test(after)) && !continues) return true;
      from = at + needle.length;
    }
  }
  return false;
}
