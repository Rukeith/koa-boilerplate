module.exports = api => {
  api.get('/', ctx => ctx.render('index', { title: 'Sample Server' }));
};
