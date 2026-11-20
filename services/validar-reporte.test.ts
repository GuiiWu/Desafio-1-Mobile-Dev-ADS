/// <reference types="node" />
/**
 * MELHORIA: testes automáticos da validação do reporte.
 * Rodar com:  npm test
 * (usa o executor de testes que já vem no Node; o `tsx` só serve para o Node
 * entender TypeScript)
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatarEndereco, LIMITE_DESCRICAO, LIMITE_TITULO, validarReporte } from "./validar-reporte";

const valido = { titulo: "Buraco na Rua das Palmeiras", descricao: "", tipo: "buraco" };

describe("validarReporte", () => {
  it("aceita um reporte válido (descrição é opcional)", () => {
    assert.equal(validarReporte(valido), null);
  });

  it("recusa título vazio ou só com espaços", () => {
    assert.equal(validarReporte({ ...valido, titulo: "" })?.campo, "titulo");
    assert.equal(validarReporte({ ...valido, titulo: "    " })?.campo, "titulo");
  });

  it("recusa título curto demais", () => {
    assert.equal(validarReporte({ ...valido, titulo: "ab" })?.campo, "titulo");
  });

  it("recusa título e descrição longos demais", () => {
    assert.equal(validarReporte({ ...valido, titulo: "a".repeat(LIMITE_TITULO + 1) })?.campo, "titulo");
    assert.equal(
      validarReporte({ ...valido, descricao: "a".repeat(LIMITE_DESCRICAO + 1) })?.campo,
      "descricao",
    );
  });

  it("recusa sem tipo ou com tipo inexistente", () => {
    assert.equal(validarReporte({ ...valido, tipo: null })?.campo, "tipo");
    assert.equal(validarReporte({ ...valido, tipo: "vulcao" })?.campo, "tipo");
  });

  it("aceita todos os tipos da lista", () => {
    for (const tipo of ["buraco", "calcada", "iluminacao", "outro"]) {
      assert.equal(validarReporte({ ...valido, tipo }), null);
    }
  });
});

describe("formatarEndereco", () => {
  it("monta rua, número, bairro e cidade", () => {
    assert.equal(
      formatarEndereco({ street: "Rua das Palmeiras", streetNumber: "120", district: "Centro", city: "Cuiabá" }),
      "Rua das Palmeiras, 120 - Centro, Cuiabá",
    );
  });

  it("usa subregion quando não vem a cidade e pula campos vazios", () => {
    assert.equal(formatarEndereco({ street: "Av. Brasil", subregion: "Sinop" }), "Av. Brasil - Sinop");
  });

  it("devolve null quando não há nada", () => {
    assert.equal(formatarEndereco(null), null);
    assert.equal(formatarEndereco({}), null);
  });
});
