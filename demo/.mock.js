module.exports = {
    // Support type as Object and Array
    'GET /api/users': {
        users: [1, 2]
    },

    // Method like GET or POST can be omitted
    '/api/users/1': {
        id: 1
    },
    'GET /api/uses/45': {
        code: 0,
        data: [],
        msg: "323"
    },
    'GET /api/:id': (ctx, next) => {
        ctx.body = {
            id: ctx.params.id
        }

    },

    'POST /api/users': (ctx) => {
        const id = parseInt(ctx.query.id);
        switch (id) {
            case 1:
                ctx.body = {
                    success: true,
                    data: {
                        id: id
                    },
                };
                break;
            default:
                ctx.body = {
                    success: true,
                    data: {
                        id: id
                    },
                };
                break;
        }
    },

    // Support for custom functions, the API is the same as express@4
    'POST /api/users/create': (ctx) => {
        ctx.body = "OK";
    },
    // /cnode/api 会被代理到 https://cnodejs.org/api, 不能代理 https
    'GET /cnode/(.*)': 'https://cnodejs.org'
};