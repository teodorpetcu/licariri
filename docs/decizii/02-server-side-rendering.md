# Server-Side Rendering

- data: (cca. 2024)
- stadiu: implementat

---

## Context

Fiecare pagină web este un document HTML însoțit de CSS și eventual JavaScript.
În general, acestea sunt generate pe bază de șabloane, umplute ulterior cu
conținut specific.

## Opțiuni

1. Server-Side Rendering (SSR)
    - server-ul se ocupă de generarea paginii web pe baza unui șablon și îl
    trimite integral clientului - adaptat website-urilor statice
2. Client-Side Rendering (CSR)
    - clientul primește de la server un șablon însoțit de cod JavaScript, prin
    care face mai multe cereri către server pentur conținut - adaptat
    website-urilor dinamice

## Decizie

Deoarece marea majoritate a conținutului de pe website-ul revistei este static
(identic pentru toți vizitatorii), SSR este mai potrivit.

Ar fi ineficient ca server-ul să genereze paginile web la fiecare request al
unui utilizator. În schimb, șabloanele paginilor pot fi umplute cu datele
necesare o singură dată, iar documentele HTML generate să fie stocate pe disc.
Serverul nu are decât să preia acele documente de pe disc, și să le actualizeze
de fiecare dată când sunt actualizate datele.

## Consecințe

Paginile site-ului pot fi indexate mai ușor de motoarele de căutare, care
înțeleg mai bine paginile SSR decât pe cele CSR (care le apar aproape goale).

În schimb, implementarea panoului de administrare al website-ului este foarte
greu de realizat pe principiile SSR; conținuturile variază între vizite diferite
și între utilizatori diferiți.

## Decizii conexe

- decizia [#01 Model-View-Controller](./01-model-view-controller.md)
