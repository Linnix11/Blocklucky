"use client";

import { useEffect, useState } from "react";

const INITIAL = ["Alice achète 2 tickets", "Bruno achète 1 ticket", "Tirage : Alice gagne"];
const GENESIS = "0000000000";

/** Empreinte SHA-256 (raccourcie à 10 caractères pour l'affichage), calculée par le navigateur. */
async function sha256(text) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 10);
}

/** Calcule les empreintes d'une chaîne : chaque bloc inclut l'empreinte du précédent. */
async function hashChain(datas) {
  const hashes = [];
  let previous = GENESIS;
  for (const [i, data] of datas.entries()) {
    previous = await sha256(`${i + 1}|${data}|${previous}`);
    hashes.push(previous);
  }
  return hashes;
}

/**
 * Mini-blockchain à manipuler : modifier un bloc change son empreinte,
 * et le bloc suivant ne « reconnaît » plus son précédent : la chaîne est cassée.
 */
export function ChainDemo() {
  const [datas, setDatas] = useState(INITIAL);
  const [sealed, setSealed] = useState(null); // empreintes d'origine, enregistrées dans les blocs suivants
  const [hashes, setHashes] = useState(null);

  useEffect(() => {
    hashChain(INITIAL).then(setSealed);
  }, []);
  useEffect(() => {
    hashChain(datas).then(setHashes);
  }, [datas]);

  if (!sealed || !hashes) return <p className="muted">Chargement de la démonstration…</p>;

  const firstBroken = hashes.findIndex((hash, i) => hash !== sealed[i]);

  return (
    <div className="chain-demo">
      <ol className="chain" aria-label="Trois blocs reliés">
        {datas.map((data, i) => {
          const broken = firstBroken !== -1 && i >= firstBroken;
          const previous = i === 0 ? GENESIS : sealed[i - 1];
          return (
            <li key={i} className={`chain-block${broken ? " is-broken" : ""}`}>
              <span className="chain-num">Bloc {i + 1}</span>
              <label>
                <span className="chain-key">Contenu</span>
                <input
                  value={data}
                  onChange={(e) => setDatas(datas.map((d, j) => (j === i ? e.target.value : d)))}
                />
              </label>
              <span className="chain-key">Empreinte du bloc précédent</span>
              <code className={i > 0 && hashes[i - 1] !== previous ? "is-bad" : ""}>{previous}</code>
              <span className="chain-key">Empreinte de ce bloc</span>
              <code className={broken ? "is-bad" : ""}>{hashes[i]}</code>
            </li>
          );
        })}
      </ol>
      <p className={`chain-status${firstBroken === -1 ? "" : " is-broken"}`} role="status">
        {firstBroken === -1
          ? "Chaîne valide : chaque bloc contient bien l'empreinte du précédent. Essayez de modifier un contenu."
          : `Chaîne cassée à partir du bloc ${firstBroken + 1} : son empreinte ne correspond plus à celle enregistrée dans la suite. Sur une vraie blockchain, des milliers d'ordinateurs le verraient tout de suite et refuseraient la modification.`}
      </p>
      {firstBroken !== -1 && (
        <button type="button" className="link-button" onClick={() => setDatas(INITIAL)}>
          Remettre les blocs d'origine
        </button>
      )}
    </div>
  );
}
