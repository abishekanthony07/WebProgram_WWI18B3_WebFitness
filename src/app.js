"use strict";

/**
 * Hauptklasse der Anwendung. Kümmert sich darum, die Anwendung auszuführen
 * und die angeforderten Bildschirmseiten anzuzeigen.
 */
import Navigo from "navigo/lib/navigo.js";
import OneRepetitionMaximum from "./maximalkraft/orm";
import Datenbank from "./datenbank/database";
import BmiRechner from "./bmi/bmiRechner";
import KjouleRechner from "./kjoule/kJouleUmrechner";
import Startseite from "./startseite/startseite";
import Anmeldevorgang from "./anmeldung/anmeldevorgang";
import Impressum from "./impressum/impressum"
import Chart from "chart.js";

class App {
    /**
     * Konstruktor.
     */
    constructor() {
        this._title = "WebFitness";
        this._currentView = null;
        this.db = new Datenbank();
        // Single Page Router aufsetzen
        this._router = new Navigo(null, false);
        this._currentUrl = "";
        this._navAborted = false;

        this._router.on({
            "*": () => this.showLogin(),
            "/wiFitness/": () => this.showStartseite(),
            "/kjouleRechner/": () => this.showKjoule(),
            "/bmiRechner/": () => this.showBmi(),
            "/maximalkraftRechner/": () => this.showMaximalKraftrechner(),
            "/impressum/": () => this.showImpressum(),
        }).resolve();

        this._router.notFound(() => {
            console.log("Page not found");
        });

        this._router.hooks({
            after: () => {
                if (!this._navAborted) {
                    // Navigation durchführen, daher die neue URL merken
                    this._currentUrl = this._router.lastRouteResolved().url;
                } else {
                    // Navigation abbrechen, daher die URL in der Adresszeile
                    // auf den alten Wert der bisherigen View zurücksetzen
                    this._router.pause(true);
                    this._router.navigate(this._currentUrl);
                    this._router.pause(false);
                    this._navAborted = false;
                }
            }
        });
    }

    /**
     * Ab hier beginnt die Anwendung zu laufen.
     */
    start() {
        this._router.resolve();
    }

    /**Zeige einen Ladebildschirm*/
    showLoadingscreen(id) {
        let loading = document.getElementById(id);
        loading.style.display = 'block';
    }

    /**Blende Ladebildschirm aus*/
    hideLoadingscreen(id) {
        let loading = document.getElementById(id);
        loading.style.display = 'none';
    }

    /**Zeige die Login Seite an*/
    showLogin() {
        /**Die Header müssen auf dieser Art und Weise entfernt werden,
         * damit die Menüs ned angezeigt werden.
         **/
        let auswahlMenu = document.getElementById('auswahlMenue');
        auswahlMenu.style.display = 'none';
        let imageArrow = document.getElementById('arrowDowndiv');
        imageArrow.style.display = 'none';
        let imageFooterMenu = document.getElementById("footerMenuP");
        imageFooterMenu.style.display = 'none';
        let footerMenu = document.getElementById('footerMenu');
        footerMenu.style.display = 'none';
        let view = new Anmeldevorgang(this, this.db);
        this._switchVisibleView(view);

        //Anmelde-Button reagiert auf enter-Tastendruck
        window.addEventListener("keypress", (p) => {
            if (p.key === "Enter") {
                if (this.db.firebase === undefined || this.db.firebase === null) {
                    this.login();
                } else {
                    this.db.firebase.auth().onAuthStateChanged((user) => {
                        if (user) {
                            // User is signed in.
                        } else {
                            this.login();
                        }

                    });
                }
            }
        });
    }

    login() {
        let email = document.getElementById('email').value;
        let password = document.getElementById('password').value;
        this.db.loginUser(
            email,//email
            password,//passwort
            () => {//failure
                alert("Anmeldevorgang fehlgeschlagen. Bitte erneut versuchen.");
            },
            (datenbank) => {//success
                this.showStartseiteAndSetListener(datenbank);
            });
    }

    /**
     * Nach dem Login muss diese Methode aufgerufen werden, damit die Listener für unsere Elemente
     * der Startseite gesetzt werden, und
     * die Menüs auch angezeigt werden.
     */
    showStartseiteAndSetListener() {
        /**einblenden von unsrerem ArrowDiv*/
        let imageArrowDiv = document.getElementById('arrowDowndiv');
        imageArrowDiv.style.display = 'block';
        /**Listener für unserem Arrow*/
        let imageArrow = document.getElementById('arrowDown');
        imageArrow.addEventListener("click", animateArrow);

        /**Footer Menü wird oben mit einer Klapptafel realisiert*/
        let imageFooterMenu = document.getElementById("footerMenuP");
        imageFooterMenu.addEventListener("click", showFooterMenu);
        imageFooterMenu.style.display = 'block';

        /**HeaderMenüs-Listener*/
        let startseiteButton = document.getElementById('startseite');
        let auswahlAbi = document.getElementById('auswahlAbi');
        let auswahlSas = document.getElementById('auswahlSas');
        let auswahlhan = document.getElementById('auswahlHan');
        startseiteButton.addEventListener("click", () => {
            this._router.navigate('/wiFitness/');
        });
        auswahlAbi.addEventListener("click", () => {
            this._router.navigate('/maximalkraftRechner/');
        });
        auswahlSas.addEventListener("click", () => {
            this._router.navigate('/bmiRechner/');
        });
        auswahlhan.addEventListener("click", () => {
            this._router.navigate('/kjouleRechner/');
        });
        /**
         * Ausblenden des Menüs wenn auf inhalt geklickt wird.
         * @type {HTMLCollectionOf<Element>}
         */
        let mains = document.getElementsByClassName('main');
        let counter;
        for (counter = 0; counter < mains.length; counter++) {
            mains.item(counter).addEventListener('click', () => {
                closeArrowAndMenu();
            });
        }
        /**Impressum-Listener*/
        let auswahlImpressum = document.getElementById('impressum');
        auswahlImpressum.addEventListener("click", () => {
            this._router.navigate('/impressum/');
        });
        /**Logout-Listener*/
        let logout = document.getElementById('logout');
        logout.addEventListener("click", () => {
            this.db.logoutUser(() => {
                this._router.navigate("*");
            }, (error) => {
                alert(error.message);
            });
        });
        this._router.navigate('/wiFitness/')
    }

    /**
     * Diese Methode zeigt die Startseite an.
     */
    showStartseite() {
        showMenueAndArrowDown();
        let view = new Startseite(this, this.db);
        this._switchVisibleView(view)
    }

    /**
     * Diese Methode zeigt den Bmi-Rechner an.
     */
    showBmi() {
        let view = new BmiRechner(this, this.db);
        this._switchVisibleView(view)
    }

    /**
     * Diese Methode zeigt den Kjoule-Rechner an.
     */
    showKjoule() {
        let view = new KjouleRechner(this, this.db);
        this._switchVisibleView(view)
    }

    /**
     * Diese Methode zeigt den MaximalKraft-Rechner an.
     */
    showMaximalKraftrechner() {
        let view = new OneRepetitionMaximum(this, this.db);
        this._switchVisibleView(view)
    }

    /**
     * Diese Methode zeigt das Impressum an.
     */
    showImpressum() {
        let view = new Impressum(this, this.db);
        this._switchVisibleView(view)
    }


    _switchVisibleContent(content) {
        let app = document.querySelector("#app");
        let main = document.querySelector("#app main");

        app.className = "";
        main.innerHTML = "";

        if (content && content.className) {
            app.className = content.className;
        }

        // Neue Inhalte des Hauptbereichs einfügen
        if (content && content.main) {
            content.main.forEach(element => {
                main.appendChild(element);
            });
        }

        // Navigo an die Links in der View binden
        this._router.updatePageLinks();
    }

    /**
     * Hole die Daten von der Datenbank und baue ein Diagramm
     * @param collection Datenbanktabellenname
     * @param savedDataDiv Div-Container vom Chart
     * @param loadingID Id vom Ladebalken-Container
     * @param chartID Id vom Chart
     * @param ueberschrift Überschrift für das Diagramm
     * @param callback (chart)
     */
    getAndSetData(collection, savedDataDiv, loadingID, chartID, ueberschrift, callback) {
        this.showLoadingscreen(loadingID);
        this.db.getData(collection, (array) => {
            let counter;
            labels = [array.length];
            data = [array.length];
            if (array.length === 0) {
                savedDataDiv.innerHTML = "Sie haben keine Werte abgespeichert!";
                this.hideLoadingscreen(loadingID);
            }
            for (counter = 0; counter < array.length; counter++) {
                let element = array[counter];
                //ORM
                if (collection === 'orm') {
                    labels[counter] = element.timestamp;
                    data[counter] = element.maximalkraft;
                    //BMI
                } else if (collection === 'bmi') {
                    labels[counter] = element.timestamp;
                    data[counter] = element.ergebnis;
                    //KCal->KJoule
                } else if (collection === 'kJoule') {
                    labels[counter] = element.timestamp;
                    data[counter] = element.summekjoulekalorien;
                }
                //Verarbeite die Daten und gebe einen Chart zurück
                if (counter === array.length - 1) {
                    savedDataDiv.innerHTML = "<canvas id=\"" + chartID + "\">";
                    let myChartObject = document.getElementById(chartID);
                    new Chart(myChartObject, {
                        type: "line",
                        data: {
                            labels: labels,
                            datasets: [{
                                label: ueberschrift,
                                backgroundColor: 'rgba(159, 96, 96, 0.4)',
                                borderColor: 'rgba(159, 96, 96, 1)',
                                data: data
                            }]
                        },
                        options: {
                            scales: {
                                yAxes: [{
                                    tricks: {
                                        beginAtZero: true
                                    }
                                }]
                            }
                        }
                    });
                    this.hideLoadingscreen(loadingID);
                    callback();
                }
            }
        })
    }
    ;

    /**
     * Hole die Daten von der Datebank und setze die Listener für die Buttons
     * @param collection Datenbanktabellenname
     * @param editDataDiv Div-Container vom Editcontainer
     * @param loadingID Id vom Ladebalken-Container
     * @param inhalt Div-Container vom MainContent
     * @param savedDataDiv Div-Container vom Chart
     * @param callback () Zeige Div-Container vom edit in der jeweiligen Klasse
     * @param callbackDelete
     */
    getAndSetEditDataFirebase(collection, editDataDiv, loadingID, inhalt, savedDataDiv, callback, callbackDelete) {
        this.showLoadingscreen(loadingID);
        this.db.getData(collection, (array) => {
            let index;
            arrayList = array;
            if (array.length === 0) {
                editDataDiv.innerHTML = "Sie haben keine Werte gespeichert!";
            } else {
                editDataDiv.innerHTML = "";
            }
            for (index = 0; index < array.length; index++) {
                let element = array[index];
                let newEl = document.createElement("div");
                newEl.className = "inhalt";
                //Inhalt wird gesetzt
                if (collection === "orm") {
                    newEl.innerHTML = "<div class='delete grid-container-standard'><div class='grid-itemLeft'><button id='delete'>Löschen?</button>&nbsp;<b></div><div class='grid-itemRight'>[" + element.timestamp + "]&nbsp;</b>Maximalkraft von&nbsp;" + element.maximalkraft + " kg</div></div>";
                } else if (collection === "bmi") {
                    newEl.innerHTML = "<div class='delete grid-container-standard'><div class='grid-itemLeft'><button id='delete'>Löschen?</button>&nbsp;<b></div><div class='grid-itemRight'>[" + element.timestamp + "]&nbsp;</b>Dein BMI beträgt &nbsp;" + element.ergebnis + "</div></div>";
                } else if (collection === "kJoule") {
                    newEl.innerHTML = "<div class='delete grid-container-standard'><div class='grid-itemLeft'><button id='delete'>Löschen?</button>&nbsp;<b></div><div class='grid-itemRight'>[" + element.timestamp + "]&nbsp;</b>Gespeicherte Ergebnisse der KJoule in Kcal Umrechnung: &nbsp;" + element.summekjoulekalorien + " kcal</div></div>";
                }
                newEl = editDataDiv.appendChild(newEl);
                //delete Listener wird gesetzt
                newEl.firstChild.firstChild.addEventListener('click', (event) => {
                    deleteElement(this.db, loadingID, collection, event, inhalt, savedDataDiv, editDataDiv, callbackDelete);
                });
            }
            this.hideLoadingscreen(loadingID);
            callback();
        })
    }

    _switchVisibleView(view) {
        closeArrowAndMenu();
        // Callback, mit dem die noch sichtbare View den Seitenwechsel zu einem
        // späteren Zeitpunkt fortführen kann, wenn sie in der Methode onLeave()
        // false zurückliefert. Dadurch erhält sie die Möglichkeit, den Anwender
        // zum Beispiel zu fragen, ob er ungesicherte Daten speichern will,
        // bevor er die Seite verlässt.
        let newUrl = this._router.lastRouteResolved().url;
        let goon = () => {
            // ?goon an die URL hängen, weil der Router sonst nicht weiternavigiert
            this._router.navigate(newUrl + "?goon");
        };

        // Aktuelle View fragen, ob eine neue View aufgerufen werden darf
        if (this._currentView && !this._currentView.onLeave(goon)) {
            this._navAborted = true;
            return false;
        }

        // Alles klar, aktuelle View nun wechseln
        document.title = `${this._title} – ${view.title}`;

        this._currentView = view;
        this._switchVisibleContent(view.onShow());
        view.onLoad();
        return true;
    }

    /**
     * Diese Methode erstellt einen Zeitstempel.
     * @returns {string}
     */
    static timeStamp() {
        const dateformat = require('dateformat');
        let today = new Date();
        return dateformat(today, 'hh:MM:ss dd-mm-yyyy');
    }
}

export default App;
/**
 * Falls die Liste leer ist wird dementsprechend eine Nachricht angezeigt.
 *
 * @param db Datenbank
 * @param collection Datenbanktabellenname
 * @param loadingID LadebildschirmID
 * @param event Event vom einzelnen Container eines gesopeicherten Elements
 * @param inhalt MainContent
 * @param savedDataDiv ChartDiv
 * @param editDataDiv EditDiv
 * @param callback ???
 */
let deleteElement = (db, loadingID, collection, event, inhalt, savedDataDiv, editDataDiv, callback) => {
    let deleteIndex = event.target.parentNode.firstChild.textContent;
    arrayList.splice(deleteIndex, 1);
    if (arrayList.length === 0) {
        editDataDiv.innerHTML = "Sie haben keine Werte gespeichert!";
    }
    db.saveData(collection, arrayList, () => {
        callback();
    });
};

/**
 * Schließt das Menü und lässt die 3 Verinkungen im Header verschwinden.
 */
let closeArrowAndMenu = () => {
    if (buttonsSindZusehen) {
        animateArrow();
    }
    if (menuSindZusehen) {
        showFooterMenu();
    }
};

/**
 * Diese Methode zeigt unser Menü und unseren Pfeil wieder an.
 */
let showMenueAndArrowDown = ()=>{
    let arrowDownDiv = document.getElementById('arrowDowndiv');
    let footerIcon = document.getElementById('footerMenuP');
    let footerMenue = document.getElementById('footerMenu');
    arrowDownDiv.classList.remove("hide");
    footerMenue.classList.remove("hide");
    footerIcon.classList.remove("hide");
};

let buttonsSindZusehen = false;
/**
 * Diese Methode animiert unser Pfeil zum anzeigen der 3 verschiedenen Seiten.
 */
let animateArrow = () => {
    let arrowDown = document.getElementById('arrowDown');
    let arrowDownDiv = document.getElementById('arrowDowndiv');
    let auswahlMenue = document.getElementById('auswahlMenue');

    if (!buttonsSindZusehen) {
        rotateImage(arrowDown, 'rotate(-180deg)');
        buttonsSindZusehen = true;
        //Div vom arrowDown hintergrund entfernen
        arrowDown.style.border = 'none';
        //Borderstyle vom ArrowButton ändern
        arrowDownDiv.style.background = 'none';
        arrowDown.style.borderTopLeftRadius = '50px';
        arrowDown.style.borderTopRightRadius = '50px';
        arrowDown.style.borderBottomLeftRadius = '0px';
        arrowDown.style.borderBottomRightRadius = '0px';
        //AuswahlMenu einblenden
        auswahlMenue.style.display = 'grid';
    } else {
        rotateImage(arrowDown, 'rotate(0deg)');
        buttonsSindZusehen = false;
        //Div vom arrowDown hintergrund entfernen
        arrowDownDiv.style.background = 'rgba(112,112,112,1)';
        //Borderstyle vom ArrowButton ändern
        arrowDown.style.borderTopLeftRadius = '0px';
        arrowDown.style.borderTopRightRadius = '0px';
        arrowDown.style.borderBottomLeftRadius = '50px';
        arrowDown.style.borderBottomRightRadius = '50px';
        //AuswahlMenü einblenden
        auswahlMenue.style.display = 'none';
    }
};

/**
 * Diese Methode sorgt dafür, dass ein Bild rotiert wird.
 * @param img
 * @param degree
 */
let rotateImage = (img, degree) => {
    img.style.transform = degree;
    img.style.WebkitTransitionDuration = '0.5s';
};

let menuSindZusehen = false;

/**
 *'Footer'-Menü wird eingeblendet
 */
let showFooterMenu = () => {
    let footerIcon = document.getElementById('footerMenuP');
    let footerMenue = document.getElementById('footerMenu');
    if (!menuSindZusehen) {
        rotateImage(footerIcon, 'rotate(-90deg)');
        menuSindZusehen = true;
        footerMenue.style.display = 'inline-block';
    } else {
        rotateImage(footerIcon, 'rotate(0deg)');
        menuSindZusehen = false;
        footerMenue.style.display = 'none';
    }
};

let labels = [];
let data = [];
let arrayList = [];