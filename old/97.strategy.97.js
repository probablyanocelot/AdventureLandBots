let Context = function () {
    this.strategy = "";
};

Context.prototype = {
    setStrategy: function (strategy) {
        this.strategy = strategy;
    },

    init: function (strategy) {
        return this.strategy.init(strategy);
    }
};

class Strategy{

}

let UPS = function () {
    this.strategy = "UPS";
    this.init = function (context) {
        console.log(context)
        // calculations...
        return "$45.95";
    }
};

let USPS = function () {
    this.strategy = "USPS";
    this.init = function (context) {
        console.log(context)
        // calculations...
        return "$39.40";
    }
};

let Fedex = function () {
    this.strategy = "Fedex";
    this.init = function (context) {
        console.log(context)
        // calculations...
        return "$43.20";
    }
};

class context {
    constructor(from, to, weight) {
        this.from = from;
        this.to = to;
        this.weight = weight;
    }
}

function run() {

    let package = { from: "76712", to: "10012", weight: "lkg" };

    // the 3 strategies

    let ups = new UPS();
    let usps = new USPS();
    let fedex = new Fedex();

    let context = new Context();

    context.setStrategy(ups);
    console.log("UPS Strategy: " + context.init(package));
    context.setStrategy(usps);
    console.log("USPS Strategy: " + context.init(package));
    context.setStrategy(fedex);
    console.log("Fedex Strategy: " + context.init(package));
}

// let Strategy = function () {
//     this.strategy = null
// };

// Strategy.prototype = {
//     setStrategy: function (strategy) {
//         this.strategy = strategy;
//     },

//     init: async function (context) {
//         return await this.strategy.init(context);
//     }
// };

// class Farm {
//     init(context) {
//         smart_move(context.location);
//         return init;
//     }
// };

// class Goo {
//     context = {
//         location: "goo"
//     }
// }

// let strategy = new Strategy();
// let farm = new Farm();
// let goo = new Farm();
run()