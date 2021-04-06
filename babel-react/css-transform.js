const transform = require("css-to-react-native-transform").default;
// var sassTransformer = require("react-native-sass-transformer");

const test = `
.foo .blu {
    color: #f00;
    line-height: calc(20/3);
    l: calc(100% - 32px);
    s: 2rem;
    a: 23px;
    transform: translate(-50px, -50px);
    x: 100%;
}
.loginDialog, .blub {
    width: 50px;
    padding: 20rem;
    transform: unset;
}
.test {
    color: white !important;
    padding: rem(10);
    transform: translate(50%, 50px) scale(5);
}
`

const test1 = `
.toolBox__flap {
    color: white !important;
    display: grid;
    padding: rem(10);
    
}
`

const result = transform(test1);
// const resultSass = sassTransformer(test);

// console.log(resultSass);
console.log(result);

// if (result.loginDialog) console.log(result.loginDialog.transform);
// if (result.test) console.log(result.test.transform);
// if (result.foo) console.log(result.foo.transform);
//npm run prepublish --prefix ../css-to-react-native-transform && node css-transform