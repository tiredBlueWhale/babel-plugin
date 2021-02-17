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
    transform: none;
}
.test {
    color: white !important;
    padding: rem(10);
    transform: translate(50%, 50px) scale(5);
}
`

const test1 = `
.maskEditor__content {
    @include flex-wrapper-wrap();
    flex-direction: row;
    justify-content: space-between;
    height: 100% !important;
    @include break-smart--landscape {
        height: calc(100% + 20px);
    }
    @include break-tablet--portrait {
        height: 86%;
    }
}
`

const result = transform(test);
// const resultSass = sassTransformer(test);

// console.log(resultSass);
console.log(result);

// if (result.loginDialog) console.log(result.loginDialog.transform);
// if (result.test) console.log(result.test.transform);
// if (result.foo) console.log(result.foo.transform);
//npm run prepublish --prefix ../css-to-react-native-transform && node css-transform