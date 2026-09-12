# Arhitectură Model-View-Controller

- data: (cca. 2024)
- stadiu: implementat

---

## Context

Website-urile, oricare le-ar fi natura, sunt proiecte relativ complexe. Codul
sursă se poate întinde ușor pe câteva de mii de linii de cod. Ideal, acesta ar
trebui să fie structurat logic, cu o separare clară între responsabilitățile
fiecărui fișier.

## Opțiuni

1. arhitectură Model-View-Controller

## Decizie

[Model-View-Controller](https://en.wikipedia.org/wiki/Model%E2%80%93view%E2%80%93controller)
(MVC) este un mod de organizare a codului sursă:

- Model: cuprinde funcțiile care realizează operații asupra bazei de date
- View: cuprinde codul referitor la aspectul paginilor web
- Controller: cuprinde codul care leagă Model de View

Practic, „View” aparține frontend-ului, iar „Model” și „Controller” aparțin
backend-ului.

De reținut: același fișier din Controller poate interacționa cu mai multe din
Model sau din View, dar **NU** cu alte fișiere din Controller. Același lucru
este valabil și pentru Model: un fișier Model trebuie să **NU** să depindă de
alt fișier Model. Cât despre view: fiecare fișier ar trebui să corespundă unei
pagini separate.

## Consecințe

Codul aplicației este împărțit între dosarele `app/model`, `app/controller`,
`app/views` și `app/public` (ultimele două reprezentând frontend-ul).

## Decizii conexe

- decizia [#02 Server-Side Rendering](./02-server-side-rendering.md)
