# Bază de date SQLite

- data: (cca. 2024)
- stadiu: implementat

---

## Context

Trebuie ales un motor de bază de date pentru indexarea documentelor prelucrate
de aplicație (articole online, respectiv reviste în format PDF)

## Opțiuni considerate la momentul respectiv

1. SQLite

## Decizie

La momentul respectiv, am ales SQLite mai mult pentru că îl mai folosisem în
trecut. Este relativ ușor de integrat în aplicații mici, locale.

## Consecințe

Timpul de dezvoltare al aplicației scade.

Dar, în retrospect, motorul SQLite:
- este destul de sărac în funcționalități (nu are *Full text search* și nici
suport pentru tipul de date JSON etc.) și este relativ slab performant
- stochează toată baza de date pe un singur fișier
- nu gestionează bine scrierile concomitente și poate da uneori eroare `SQLite
Busy`

## Decizii conexe

- decizia [#NN TITLU](./nn-titlu.md)
