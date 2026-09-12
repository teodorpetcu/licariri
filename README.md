# <a href="https://licariri.ro"><img src="./app/public/logo-mic.webp" style="height: 100px"></a><a href="https://mesota.ro"><img src="./app/public/logo-mesota.webp" style="height: 100px"></a>

Aplicația din spatele website-ului [licariri.ro](https://licariri.ro),
construită cu Express.js + EJS și self-hosted. De la elevii C. N. „Dr. Ioan
Meșotă” Brașov, pentru elevii C. N. „Dr. Ioan Meșotă” Brașov.

Pentru că generațiile vin și pleacă, dar amprenta lor rămâne.

## Structura repertoriului

- dosarul `docs/` - cuprinde documentația proiectului
- dosarul `app/` - conține codul sursă al website-ului
- dosarul `tests/` - conține teste unitare și de integrare
- dosarul `infrastructure/` - elemente referitoare la găzduire

## Instalare și rulare

Cea mai simplă metodă necesită programele:
- `git`
- Docker
- Docker Compose

Pe un sistem Linux, instalarea și rularea aplicației presupun folosirea
următoarelor comenzi:

```
$ git clone https://github.com/teodorpetcu/licariri.git
$ cd licariri
$ docker build -t licariri .
$ docker-compose up
```

## Contribuții

Contribuțiile sunt primite cu drag! Pentru probleme sau sugestii, poți deschide
un *issue* pe GitHub; dacă dorești să contribui cod, atunci deschide un *pull
request*.

## Licență

[AGPLv3](./LICENSE)
