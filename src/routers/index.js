const user_routers = require("./user-routers")
const admin_routers = require('./admin-routers')
const transaction_routers = require('./transaction-routers')
const product_routers = require('./product-routers')
const category_routers = require('./category-routers')
const cart_routers = require('./cart-routers')

module.exports = {
    user_routers,
    admin_routers,
    transaction_routers,
    product_routers,
    category_routers,
    cart_routers
}