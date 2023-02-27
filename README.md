# AdSP Bpm

Il modulo implementa/contiene/centralizza le logiche di gestione di workflow delle pratiche.

## Architettura dei dati

- pratica
  - tasks
    - steps
      - quadri

* una pratica può avere dei task
  - un task può avere degli step
    - uno step può avere dei quadri

### Osservazioni

Il task può essere usato su più procedimenti/pratiche, non necessariamente con gli stessi step (domanda: da capire se è un caso reale).

Il quadro è l'entità che contiene i meta/dati della pratica ed ha lo scopo di permettere all'utente la visualizzazione e/o inseririmento/modifica di tali meta/dati.

Un quadro può essere usato su più task/step, non necessariamente con gli stessi meta/dati.

Esempio reale

Una pratica instanziata dal procedimento **Procedimento Accesso Civico Semplice** avrà la seguente struttura

- pratica
  - task apertura pratica
    - step dati pratica
      - quadro riferimenti
      - quadro dati richiedente
      - quadro per conto di
      - quadro richiesta
    - step collaboratori
      - quadro collaboratori
    - step documenti
      - quadro documenti
    - step informativa privacy
    - quadro informativa privacy
  - task verifica sottoscrizione
    - step dati delegati
      - quadro dati delegati
    - step validità istanza
      - quadro validità istanza
  - task verifica procedibilità
    - step verifica procedibilità instanza
      - quadro procedibilità instanza
  - task assegnazione istanza UORD
    - step comunicazione responsabilità del dato a RPCT
      - quadro comunicazione ricevuta da RPCT
      - quadro responsabilità del dato
      - quadro crea comunicazione
  - task avvio procedimento
    - step comunicazione avvio procedimento
      - quadro crea comunicazione
  - task apertura registro accessi
    - step apertura procedimento su registro accessi
      - quadro dati generali
      - quadro uffico detentore del dato
  - task comunicazione link
    - step comunicazione link del dato a RPCT
      - quadro comunicazione ricevuta da RPCT
      - quadro crea comunicazione
  - task comunicazione pubblicazione
    - step comunicazione avvenuta pubblicazione
      - quadro comunicazioni link inviate da UORD
  - task chiusura registro accessi
    - step chiusura procedimento su registro accessi
      - quadro dati generali
      - quadro ufficio detentore del dato
      - quadro esito
  - task pratica chiusa

### Osservazione

Come si può vedere dalla struttura precedente il **quadro crea comunicazione** è usato nei task/step

- task comunicazione link
  - step comunicazione link del dato a RPCT
- task avvio procedimento
  - step comunicazione avvio procedimento
- task assegnazione istanza UORD
  - step comunicazione responsabilità del dato a RPCT

## Architettura del software

### Folder

La cartella bpm-pratiche interna alle pages contiene quasi l'intera logica di gestione del workflow:

- la cartella rappresenta il feature-module bpm-pratiche.module
- la cartella components contiene i componenti del modulo
- la cartella quadri contiene tutti i moduli lazy (possono avere componenti, servizi, pipe, direttive, model etc) dei quadri caricati e renderizzati dinamicamente

La cartella core interna alle pages contiene

- la cartella service contiene tutti i servizi del modulo (api, resolver, store)
- la cartella model contiene le interfaccie dei dati trattati (risposte api, metadati)

### Routing task e step

L'alberatura del routing è così composta

- il routing del modulo bpm-pratiche ha due livelli
  - il primo livello renderizza la struttura generale del task
  - il secondo livello renderizza il componente atto alla dinamicizazione dei quadri

Di conseguenza si viene a formare questa url **/bpm/:uidPratica/:task/:step** dove :uidPratica, :task e :step sono dinamici.

Di seguito alcune possibili url

- /bpm/aasdadad-224sdf-s342dfsd342r-3adfsdf/apertura-pratica/dati
- /bpm/aasdadad-224sdf-s342dfsd342r-3adfsdf/apertura-pratica/collaboratori
- /bpm/aasdadad-224sdf-s342dfsd342r-3adfsdf/verifica-sottoscrizione/dati-delegati

### Componente Main

Questo componente è responsabile di renderizzare la struttura/layout del task:

- informazioni di testata (riepilogative)
- eventuale componente accordion di dettaglio dei task finorà completati
- stepper dinamico
- router outlet per rendirizzare il componente StepComponent

### Componente Step

Questo componente è responsabile di renderizzare i quadri in maniera dinamica caricando solo quelli ricevuti dall'api. Qua dentro è presente la logica descritta brevemente nel paragrafo seguente.

### Moduli dei quadri

Angular non ha un meccanismo nativo, semplice come il lazy loading dei moduli sul routing per eseguire il code splitting a livello di componente ma dalla versione 9 (la stessa utilizzata su AdSP) è stato introdotto il motore di rendering Ivy il quale permette una maggiore eleasticità in termini di code splitting sui componenti.

I componenti dei quadri saranno compilati in chunk (grazie ad Ivy) e saranno caricati e rendirizzati dinamicamente su ogni step. Il caricamento e render dinamico è implementato seguendo i link

- https://angular.io/guide/dynamic-component-loader
- https://medium.com/angular-in-depth/lazy-load-components-in-angular-596357ab05d8
- https://johnpapa.net/angular-9-lazy-loading-components/
- https://indepth.dev/lazy-loading-angular-modules-with-ivy

Per avere una struttura elastica ogni quadro è rappresentato in realtà da un modulo il quale potrà contenere servizi, componenti, modelli, direttive, pipe e qualsiasi cosa serva. Nel momento in cui il quadro deve essere caricato, viene eseguito un import dinamico del modulo e del componente principale (vedi [step.component.ts](src/app/pages/bpm-pratiche/components/step/step.component.ts#L43))

Viene mantenuta una mappatura uid (dato back end) con le informazioni necessarie per rendirizzare il quadro (vedi [mappaQuadri.ts](src/app/pages/core/mappaQuadri.ts))


## Installazione dipendenze

Eseguire il comando `npm install`. Per installare le dipendenze @eng-ds bisogna configurare il proprio npm con il nexus aziendale.

## Git

Per i commit usiamo le specifiche qui definite: https://www.conventionalcommits.org/en/v1.0.0/ , questo ci consente di avere una history del repo pulita 
e generare un file di CHANGELOG.md pulito e sensato. 

Per effettuare il commit eseguire il comando tramite terminale o cmd: 

`git commit`

Seguire le istruzioni fornite dallo script per eseguire il commit

