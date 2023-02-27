module.exports = {
  post: {},
  patch: {
    "/hunter/update": "/hunter/:id",
  },
  get: {
    "/apiscrivania/praticaDetail": "/apiscrivania/1.0/pratica/:uuidPratica",
    "/apiscrivania/associaUtenti":
      "/apiscrivania/1.0/pratica/:uuidPratica/associaUtenti",
    "/apiscrivania/richiestaAccesso":
      "/apiscrivania/1.0/pratica/:uuidPratica/richiestaAccesso",
    "/apiscrivania/richiedente":
      "/apiscrivania/1.0/pratica/:uuidPratica/richiedente",
    "/apiscrivania/delegante":
      "/apiscrivania/1.0/pratica/:uuidPratica/delegante",
    "/apiscrivania/ufficiCompetenti":
      "/apiscrivania/1.0/pratica/:uuidPratica/ufficiCompetenti",
    "/apiscrivania/stepInfo":
      "/apiscrivania/1.0/praticaBPM/stepinfo/:uuidPratica/:uuidTask/:uuidStep",
    "/apiscrivania/taskInfo":
      "/apiscrivania/1.0/praticaBPM/taskInfo/:uuidPratica/:uuidTask",
    "/apiscrivania/nextTask": "/apiscrivania/1.0/praticaBPM/nexttask/:uuid",
    "/apiscrivania/privacy": "/apiscrivania/1.0/pratica/:uuid/infoPrivacy",
    "/apiscrivania/req1": "/apiscrivania/1.0/praticaBPM/getReq1",
    "/apiscrivania/stepdatainfo":
      "/apiscrivania/1.0/praticaBPM/stepdatainfo/:uuidPratica/:uuidProcTask/:uuidProcTaskStep",
    "/apiscrivania/comunicazioniAccessoAUORD":
      "/apiscrivania/1.0/pratica/:uuidPratica/comunicazioniAccessoAUORD",
    "/apiscrivania/tasksDetail":
      "/apiscrivania/1.0/praticaBPM/getTaskDetail/:uuidPratica",
    "/apiscrivania/quadriDataValues":
      "/apiscrivania/1.0/praticaBPM/getDataDetail/:uuidPratica/:uuidTask",
  },
};
