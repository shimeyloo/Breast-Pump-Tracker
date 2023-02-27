const SESSION = "Sessions";
const PORT = 8080;



// CONFIGURATION
const express = require("express");
const { Datastore } = require("@google-cloud/datastore");
const app = express();
const datastore = new Datastore();
app.use(express.json());
const cors = require("cors");
app.use(cors());

/*----------------------- UTILITY FUNCTIONS START------------------------- */
function fromDatastore(item) {
  item.id = parseInt(item[datastore.KEY].id, 10);
  return item;
}

async function getAllSessions() {
  const q = datastore.createQuery(SESSION);
  return datastore.runQuery(q).then((entities) => {
    return entities[0].map(fromDatastore);
  });
}

async function getSession(sessionId) {
  const key = datastore.key([SESSION, parseInt(sessionId, 10)]);
  return datastore.get(key).then((session) => {
    if (session[0] !== undefined || session[0] !== null) {
      return session.map(fromDatastore);
    }
    return 404;
  });
}

async function addSession(reqBody) {
  const key = datastore.key(SESSION);
  const { dateTime, leftVolume, rightVolume, duration, notes } = reqBody;
  const newSession = {
    dateTime: dateTime,
    leftVolume: leftVolume,
    rightVolume: rightVolume,
    duration: duration,
    notes: notes,
  };
  await datastore.save({ key: key, data: newSession });
  return key;
}

async function editSessionPut(req) {
  const { sessionId } = req.params;
  const { leftVolume, rightVolume, duration, notes } = req.body;
  const key = datastore.key([SESSION, parseInt(sessionId, 10)]);
  let session = await getSession(sessionId).then((session) => {
    return session[0];
  });
  session.leftVolume = leftVolume;
  session.rightVolume = rightVolume;
  session.duration = duration;
  session.notes = notes;
  await datastore.save({ key: key, data: session });
  return session;
}

async function deleteSession(sessionId) {
  const key = datastore.key([SESSION, parseInt(sessionId, 10)]);
  let session = await datastore.get(key).then((session) => {
    return session[0];
  });
  if (session === undefined || session === null) return 404;

  return datastore.delete(key).then((result) => {
    return result;
  });
}

/*----------------------- UTILITY FUNCTIONS END -------------------------- */

/*----------------------- VALIDATOR FUNCTIONS  --------------------------- */

function errorMsg(statusCode) {
  const statusCodes = {
    400: { code: 400, message: "Bad Request" },
    401: { code: 401, message: "Unauthorized" },
    404: { code: 404, message: "Not Found" },
    405: { code: 405, message: "Method Not Allowed" },
    406: { code: 406, message: "Not acceptable, cannot accept media type" },
    415: {
      code: 415,
      message: "Unsupported media type, cannot provide requested media type",
    },
  };
  return statusCodes[statusCode];
}

function validatePostRequest(reqBody) {
  const { leftVolume, rightVolume, duration } = reqBody;

  // volumes and duration must be greater than 0
  if (leftVolume <= 0 || rightVolume <= 0 || duration <= 0) return 400;

  return 201;
}

async function validatePutRequest(req) {
  // TODO: validation to be added
  return 200;
}

/*----------------------- VALIDATOR FUNCTIONS  --------------------------- */

/*----------------------- ROUTING FUNCTIONS START------------------------- */

/* 
  IMPLEMENTS BASIC C.R.U.D. FUNCTIONALITES
*/

// get all sessions
app.get("/", async (req, res) => {
  allSessionsResult = await getAllSessions();
  res.json(allSessionsResult);
});

app.get("/:sessionId", async (req, res) => {
  const sessionResult = await getSession(req.params.sessionId);
  switch (sessionResult) {
    case 404:
      res.status(sessionResult).json(errorMsg(sessionResult));
      break;
    default:
      res.status(200).json(sessionResult[0]);
  }
});

// add new session
app.post("/sessions", async (req, res) => {
  validateResult = validatePostRequest(req.body);
  switch (validateResult) {
    case 201:
      const postedSession = await addSession(req.body);
      res.status(validateResult).json({
        id: parseInt(postedSession.id, 10),
        ...req.body,
      });
      break;
    default:
      return res.status(validateResult).json(errorMsg(validateResult));
  }
});

// edit a session
app.put("/:sessionId", async (req, res) => {
  console.log(req.params)
  const verifyResult = await validatePutRequest(req);
  switch (verifyResult) {
    case 200:
      const modifiedSession = editSessionPut(req);
      res.status(verifyResult).json(modifiedSession);
      break;
    default:
      res.status(verifyResult).json(errorMsg(verifyResult));
  }
});

// delete a session
app.delete("/:sessionId", async (req, res) => {
  const deleteResult = await deleteSession(req.params.sessionId);
  switch (deleteResult) {
    case 404:
      res.status(deleteResult).json(errorMsg(deleteResult));
      break;
    default:
      res.status(204).end();
  }
});

/*----------------------- ROUTING FUNCTIONS START------------------------- */

app.listen(PORT, () => console.log(`listening on port ${PORT}...`));
