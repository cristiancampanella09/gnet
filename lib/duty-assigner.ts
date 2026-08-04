import { Person } from "./excel-reader";

export interface Assignments {
  ufficiale: Person | null;
  capo1_psl: Person | null;
  capo2_psl: Person | null;
  assist1_psl: Person | null;
  assist2_psl: Person | null;
  capo1_br: Person | null;
  capo2_br: Person | null;
  mensa: Person | null;
  ispezione_br: Person | null;
  infermeria: Person | null;
}

export type RoleKey = keyof Assignments;

export const ROLE_ORDER: RoleKey[] = [
  "ufficiale",
  "infermeria",
  "capo1_psl",
  "capo2_psl",
  "assist1_psl",
  "assist2_psl",
  "capo1_br",
  "capo2_br",
  "mensa",
  "ispezione_br",
];

export const ROLE_LABELS: Record<RoleKey, string> = {
  ufficiale: "Ufficiale d'Ispezione",
  infermeria: "Infermeria",
  capo1_psl: "Capo Guardia 1ª Muta PSL",
  capo2_psl: "Capo Guardia 2ª Muta PSL",
  assist1_psl: "Assistente 1ª Muta PSL",
  assist2_psl: "Assistente 2ª Muta PSL",
  capo1_br: "Capo Guardia 1ª Muta BR",
  capo2_br: "Capo Guardia 2ª Muta BR",
  mensa: "Mensa",
  ispezione_br: "Ispezione Porto Athos",
};

export function buildAssignments(
  rolePeople: Partial<Record<RoleKey, Person | null>>
): Assignments {
  const assignments = {} as Assignments;
  for (const role of ROLE_ORDER) {
    assignments[role] = rolePeople[role] ?? null;
  }
  return assignments;
}

export function getFullName(person: Person | null): string {
  if (!person) return "—";
  return `${person.grado} ${person.cognome.toUpperCase()} ${person.nome.toUpperCase()}`;
}

export function getPhone(person: Person | null): string {
  if (!person) return "—";
  if (person.tel_uff && person.tel_uff !== "" && person.tel_uff !== "0") {
    return `X ${person.tel_uff}`;
  }
  return person.cell || "—";
}