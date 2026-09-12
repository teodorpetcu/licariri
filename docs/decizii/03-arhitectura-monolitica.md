# Arhitectură monolitică

- data: (cca. 2024)
- stadiu: implementat

---

## Context

Înainte de implementarea propriu-zisă a website-ului, trebuie luată o decizie
asupra modului în care diversele componente ale acestuia interacționează.

## Opțiuni

1. arhitectură monolitică (un singur program informatic)
2. aplicație împărțită în microservicii (adică în mai multe programe informatice
   specializate care comunică între ele)

Am ales implementarea unei arhitecturi monolitice.

## Avantaje

Aplicațiile monolitice oferă un avantaj clar: sunt mult mai simple și pot fi
dezvoltate mai rapid. Toate funcționalitățile server-ului se desfășoară în
cadrul același program informatic.

## Dezavantaje

Aplicațiile monolitice sunt foarte greu scalabile (deși website-ul revistei nu
ar avea oricum foarte mult trafic).

Problema adevărată pe viitor este legată de erori: dacă există, oriunde în
program, toată aplicația se închide, și site-ul pică temporar.
