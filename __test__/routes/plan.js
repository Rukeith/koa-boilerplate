const request = require('superagent');

describe('GET /v1/plans', () => {
  test('GET /v1/plans', (done) => {
    request.get('/v1/plans')
      .query({ currency: 'usd' })
      .end((err, res) => {
        if (err) return done.fail(err);

        try {
          
        } catch (error) {
          done.fail(error);
        }
      });
  });
});