const db = require('../config/db');

const addNewCard = (customer_id, coachee_id, card_id, finger_print) => {
  return new Promise((resolve, reject) => {
    const query =
      'INSERT INTO card (customer_id,coachee_id,card_id,finger_print) VALUES  ($1,$2,$3,$4) RETURNING *';

    db.query(
      query,
      [customer_id, coachee_id, card_id, finger_print],
      (error, result) => {
        if (error) {
          reject(error);
        }
        resolve(result?.rows);
      }
    );
  });
};

const updateCard = (card_id, finger_print) => {
  return new Promise((resolve, reject) => {
    const query =
      'UPDATE card SET card_id = $1 WHERE finger_print = $2  RETURNING *;';

    db.query(query, [card_id, finger_print], (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result?.rows);
    });
  });
};
const getAllByCoachee = (coachee_id) => {
  return new Promise((resolve, reject) => {
    const query =
      "SELECT *, (SELECT json_agg(json_build_object('card_id', card_id, 'id', id)) FROM card WHERE coachee_id = $1) AS cardList FROM coachee where id=$1; ";
    db.query(query, [coachee_id], (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result?.rows[0]);
    });
  });
};

const getCardByFingerPrint = (finger_print) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM card WHERE finger_print=$1';

    db.query(query, [finger_print], (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result.rows);
    });
  });
};

const getByCard = (id) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM card WHERE id=$1';

    db.query(query, [id], (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result.rows);
    });
  });
};

const cardDelete = (id) => {
  return new Promise((resolve, reject) => {
    const query = 'DELETE FROM card WHERE id=$1 RETURNING * ';

    db.query(query, [id], (error, result) => {
      if (error) {
        reject(error);
      }
      resolve(result.rows[0]);
    });
  });
};

module.exports = {
  addNewCard,
  getAllByCoachee,
  getByCard,
  updateCard,
  cardDelete,
  getCardByFingerPrint,
};
