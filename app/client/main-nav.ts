// Copyright (C) 2026  Teodor Petcu  <petcuteodor03@gmail.com>
// This file is part of licariri.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

const menuCheckbox = (document.getElementById("main-nav-button-checkbox")! as HTMLInputElement);
const mainNav = (document.getElementById("hamburger-menu")! as HTMLDivElement);
const menuLinks: HTMLCollectionOf<Element> = document.getElementsByClassName("menu-link")!;
const hideCover = () => {
    menuCheckbox.checked = false;
    mainNav.classList.remove("open");
    document.body.classList.remove("open");
    document.getElementById("cover")!.addEventListener("transitionend", function handler(evt) {
        if (evt.propertyName == "opacity") {
            document.body.classList.remove("bring-cover-front");
        }
        document.getElementById("cover")!.removeEventListener("transitionend", handler);
    })
}
for (const menuLink of menuLinks) {
    menuLink.addEventListener(("click"), (_) => {
        hideCover();
    })
}
globalThis.addEventListener("click", (evt: Event) => {
    //
    if(mainNav.classList.contains("open") &&
       evt.target instanceof Node &&
       ! document.getElementById("hamburger-menu")!.contains(evt.target)) {
        hideCover();
    }
})
menuCheckbox.addEventListener("change", function() {
    if (this.checked) {
        mainNav.classList.add("open");
        document.body.classList.add("bring-cover-front");
        document.body.classList.add("open");
    } else {
        hideCover();
    }
})
menuCheckbox.checked = false;
//globalThis.dispatchEvent(new Event('resize'));
