const babel = require("@babel/core");
const babelParser = require("@babel/parser");
const generate = require("@babel/generator");
const t = require("@babel/types");

const CLASS_NAME_TRANSFORM = "style";
const STYLE_IMPORT = "styleImport";
const STYLE_SHEET = "react-native/styleSheet.scss";
const RN_SVG_GET = "getRNIcon";
const RN_SVG = "react-native/RNSVG";
const RN_ON_CLICK = "onPress";

const DEBUG_STYLE_IMPORT = false;
const DEBUG_NATIVE_IMPORT = false;
const DEBUG_SVG_IMPORT = false;
const DEBUG_TEXT_WRAPPER = false;

const DEBUG_TRANSFORM = false;
const DEBUG_CONDITINAL_EXPRESSION = false;
const DEBUG_BINARY_EXPRESSION = false;
const DEBUG_CALL_EXPRESSION = false;
const DEBUG_ALL_EXPRESSIONS = false;
const DEBUG_SVG_TRANSFORM = false;

const reactNativeImports = new Set();
const svgImports = new Set();
let cssTransform = false;
let svgMapImport = false;
const transformError = [];

// const code = `
// const Icon = () => {
// return (
// <div>
//     <svg className={props.class}>
//         <use xlinkHref={props.icon}/>
//     </svg>
//     <svg className={props.isOpen ? "items__ico ico_arrow" : "items__ico ico_arrow icon-rotate-180"}>
//         <use xlinkHref={"#ico_arrow_upper"} />
//     </svg>
//     <svg className="items__ico">
//         <use xlinkHref={"#" + this.props.icon}/>
//     </svg>
// </div>)}`

const code =`
<div>
<svg className="items__ico">
    <use xlinkHref={"#" + this.props.icon}/>
</svg>
<svg className={props.isOpen ? "items__ico ico_arrow" : "items__ico ico_arrow icon-rotate-180"}>
    <use xlinkHref={"#ico_arrow_upper"} />
</svg>
</div>
`


// console.log(code);

const ast = babelParser.parse(code, {
    sourceType: "module",
    plugins: ["jsx"],
});

const processJSXElements = {
    JSXElement: (path) => {
        const reactJSArrayToReactNative = (reactJsNames, reactNativeName, importArray) => reactJsNames.forEach(name => reactJSToReactNative(name, reactNativeName, importArray));
        const reactJSToReactNative = (reactJSName, reactNativeName, importArray) => {
            if (path.node.openingElement.name.name === reactJSName) {
                importArray.add(reactNativeName);
                path.node.openingElement.name.name = reactNativeName;

                if (path.node.closingElement && path.node.closingElement.name) {
                    path.node.closingElement.name.name = reactNativeName;
                }
                return;
            }
        };
        const hasAttribute = (attributes, attribute) => {
            for (const index in attributes) {
                if (attributes[index].name && attributes[index].name.name === attribute) return true;
            }
        };

        const textWrapper = (child) => {
            if (t.isMemberExpression(child) || t.isIdentifier(child)) {
                const name = t.isMemberExpression(child) ? child.property.name : child.name;
                if (DEBUG_TEXT_WRAPPER) console.log(`TEXTWRAPPER isMemberExpression ${name}`);
                return (
                    /label/im.test(name) ||
                    /text/im.test(name) ||
                    /placeholder/im.test(name) ||
                    /title/im.test(name) ||
                    /date/im.test(name)
                );
            } else if (t.isCallExpression(child)) {
                const name = t.isMemberExpression(child.callee) ? child.callee.property.name : child.callee.name;
                if (DEBUG_TEXT_WRAPPER) console.log(`TEXTWRAPPER isCallExpression ${name}`);
                return /translations/im.test(name);
            } else {
                // console.log(`TEXTWRAPPER `);
                return false;
            }
        };

        if (path.node.openingElement && path.node.openingElement.name) {
            if (path.node.openingElement.name.name === "div") {
                if (path.node.children) {
                    for (const index in path.node.children) {
                        if (t.isJSXExpressionContainer(path.node.children[index])) {
                            if (textWrapper(path.node.children[index].expression)) {

                                path.node.children[index] = t.jSXElement(
                                    t.jSXOpeningElement(t.jSXIdentifier("Text"), []),
                                    t.jSXClosingElement(t.jSXIdentifier("Text")),
                                    [path.node.children[index]]);
                                reactNativeImports.add("Text");
                            }
                        }
                    }
                }
                if (hasAttribute(path.node.openingElement.attributes, "onClick")) {
                    reactJSToReactNative("div", "TouchableOpacity", reactNativeImports);
                } else {
                    reactJSToReactNative("div", "View", reactNativeImports);
                }
            }

            if (path.node.openingElement.name.name === "svg") {
                for (const child of path.node.children) {
                    if (t.isJSXElement(child) && child.openingElement.name.name === "use" && 
                        child.openingElement.attributes.length === 1 && child.openingElement.attributes[0].name.name === "xlinkHref") {
                        svgTransform = true;
                        /** SVG Identifier */
                        let iconIdentifier;
                        if (t.isJSXExpressionContainer(child.openingElement.attributes[0].value)) {
                            iconIdentifier = child.openingElement.attributes[0].value.expression;
                        } else if (t.isStringLiteral(child.openingElement.attributes[0].value)) {
                            iconIdentifier = child.openingElement.attributes[0].value.value;
                        } else {
                            if (DEBUG_SVG_TRANSFORM) transformError.push({ node: node, message: 'SVG iconIdentifier VALUE NOT SUPPORTED' });
                            iconIdentifier = "";
                        }
                        /** Icon === String or Variable {RNIcon = props.icon ? SVGMap[props.icon] : null }*/
                        // const svgAssigment = t.isStringLiteral(iconIdentifier) || t.isLiteral(iconIdentifier) || t.isBinaryExpression(iconIdentifier) ?
                        // t.memberExpression(t.identifier(SVG_MAP_IMPORT), iconIdentifier, true) :
                        // t.conditionalExpression(iconIdentifier, t.memberExpression(t.identifier(SVG_MAP_IMPORT), iconIdentifier, true), t.nullLiteral());
                        // const svgAssigmentContainer = t.jSXExpressionContainer(t.assignmentExpression('=', t.identifier(ICON_ELEMENT), svgAssigment));
                        /** SVG Element */
                        const style = [];
                        for (const attribute of path.node.openingElement.attributes) {
                             if (attribute.name.name === 'className') {
                                // style.push(t.jSXAttribute(t.jSXIdentifier('className'), attribute.value));

                                const getSVGStyleImport = (node) => {
                                    if (t.isStringLiteral(node)) {
                                        console.log("String");
                                        const classNames = stringValue(node);
                                        const memberExpressionArray = stringToMemberExpression(classNames);
                                        return memberExpressionArray[0];
                                    } else if (t.isMemberExpression(node)) {
                                        return node;
                                    } else if (t.isJSXExpressionContainer(node)) {
                                        return getSVGStyleImport(node.expression);
                                    } else if (t.isConditionalExpression(node)) {
                                        return getSVGStyleImport(node.consequent);
                                    } else {
                                        if (DEBUG_SVG_TRANSFORM) transformError.push({ node: node, message: 'SVG TRANSFORMER NODE NOT SUPPORTED' });
                                        return t.memberExpression(t.identifier(STYLE_IMPORT), t.stringLiteral("items__ico"), true);
                                    }
                                };
                                const styleImport = getSVGStyleImport(attribute.value);
                                console.log(styleImport);
                                const rnIconGetFunction = t.callExpression(t.identifier(RN_SVG_GET), [iconIdentifier, styleImport]);
                                path.replaceWithMultiple(t.jSXExpressionContainer(rnIconGetFunction));
                                t.jSXFragment(t.jsxOpeningFragment(), t.jsxClosingFragment, [])
                                // const heightValue = t.jSXExpressionContainer(t.memberExpression(styleImport, t.stringLiteral('height'), true));
                                // style.push(t.jsxAttribute(t.jSXIdentifier('height'), heightValue));
                                // const widthValue = t.jSXExpressionContainer(t.memberExpression(styleImport, t.stringLiteral('width'), true));
                                // style.push(t.jsxAttribute(t.jSXIdentifier('width'), widthValue));
                                // break;
                            }
                        }
                        // const icon = t.jSXElement(t.jsxOpeningElement(t.jSXIdentifier(ICON_ELEMENT), style, true), null, []);
                        // const iconContainer = t.jSXExpressionContainer(t.logicalExpression('&&', t.identifier(ICON_ELEMENT), icon));
                        // const replacingNode = [svgAssigmentContainer, iconContainer]
                        

                        // if (t.isJSXElement(path.parentPath)) {
                            
                        // } else {
                        //     path.replaceWith(
                        //         t.jSXElement(
                        //         t.jsxOpeningElement(t.jSXIdentifier('div'), []), 
                        //         t.jsxClosingElement(t.jSXIdentifier('div')),
                        //         replacingNode)
                        //     )
                        // }

                        
                        return;
                        // path.get('body').unshiftContainer('body', t.expressionStatement(t.stringLiteral('before')));
                        // path.get('body').pushContainer('body', t.expressionStatement(t.stringLiteral('after')));
                    }
                }
            }
            reactJSToReactNative("button", "Pressable", reactNativeImports);
            // reactJSToReactNative("div", "View", reactNativeImports);
            // reactJSToReactNative("input", "TextInput", reactNativeImports);
            reactJSToReactNative("image", "Image", reactNativeImports);
            reactJSArrayToReactNative(["p", "span", "label"], "Text", reactNativeImports);
            reactJSToReactNative("form", "Form", reactNativeImports);
            // https://github.com/react-native-svg/react-native-svg#g
            
            reactJSToReactNative("svg", "Svg", svgImports);
            reactJSToReactNative("rect", "Rect", svgImports);
            reactJSToReactNative("circle", "Circle", svgImports);
            reactJSToReactNative("ellipse", "Ellipse", svgImports);
            reactJSToReactNative("line", "Line", svgImports);
            reactJSToReactNative("polygon", "Polygon", svgImports);
            reactJSToReactNative("polyline", "Polyline", svgImports);
            reactJSToReactNative("path", "Path", svgImports);
            reactJSToReactNative("text", "Text", svgImports);
            reactJSToReactNative("tspan", "TSpan", svgImports);
            reactJSToReactNative("textPath", "TextPath", svgImports);
            reactJSToReactNative("g", "G", svgImports);
            reactJSToReactNative("use", "Use", svgImports);
            reactJSToReactNative("symbol", "Symbol", svgImports);
            reactJSToReactNative("defs", "Defs", svgImports);
            reactJSToReactNative("image", "Image", svgImports);
            reactJSToReactNative("clipPath", "ClipPath", svgImports);
            reactJSToReactNative("linearGradient", "LinearGradient", svgImports);
            reactJSToReactNative("radialGradient", "RadialGradient", svgImports);
            reactJSToReactNative("mask", "Mask", svgImports);
            reactJSToReactNative("pattern", "Pattern", svgImports);
            reactJSToReactNative("marker", "Marker", svgImports);
            reactJSToReactNative("foreignObject", "ForeignObject", svgImports);
            reactJSToReactNative("stop", "Stop", svgImports);
            

            const getInputType = (attributes) => {
                for (const index in attributes) {
                    if (attributes[index].value.value === "checkbox") return "checkbox";
                }
            };
            if (path.node.openingElement.name.name === "input") {
                const type = getInputType(path.node.openingElement.attributes);
                if (type === "checkbox") {
                    for (const i in path.node.openingElement.attributes) {
                        if (path.node.openingElement.attributes[i].name.name === "checked") {
                            path.node.openingElement.attributes[i].name.name = "value";
                        }
                        if (path.node.openingElement.attributes[i].name.name === "onChange") {
                            path.node.openingElement.attributes[i].name.name = "onValueChange";
                        }
                    }
                    reactJSToReactNative("input", "Switch", reactNativeImports);
                } else {
                    reactJSToReactNative("input", "TextInput", reactNativeImports);
                }
            }
            // if (path.node.openingElement.name.name === "TouchableOpacity") reactNativeImports.add("TouchableOpacity");
        }

    },
    JSXAttribute: (path) => {
        const node = path.node;
        if (node.name.name === "className") {
            node.name.name = CLASS_NAME_TRANSFORM;
            node.value = t.jSXExpressionContainer(transformStyle(node.value));

        } else if (/^.*.(ClassName)$/.test(node.name.name)) {
            node.value = t.jSXExpressionContainer(transformStyle(node.value));

        } else if (node.name.name === "onClick") {
            node.name.name = RN_ON_CLICK;

        // } else if (node.name.name === "xlinkHref") {
        //     node.name.name = "href";

        // eslint-disable-next-line no-empty
        } else {
        }
    },
    // ImportDeclaration: (path) => {
    //     //TODO::DELETE CSS IMPORT svgParsing.ts
    //     if (/^.*\.(scss|sass)$/.test(path.node.source.value)) { //&& !/^.*\/main\.scss$/.test(path.node.source.value)) {
    //         if (DEBUG_STYLE_IMPORT) console.log(`ADDED ${STYLE_IMPORT} to ${path.node.source.value}`);
    //         //TODO: Check if there is already an import then push
    //         path.node.specifiers = [t.importDefaultSpecifier(t.identifier(STYLE_IMPORT))];
    //     }
    // },
    VariableDeclarator: (path) => {
        // path.
        if (path.node.id && path.node.id.name === "className") {
            // console.log(path.node.init);
            path.node.init = transformStyle(path.node.init);
            // path.id.name = CLASS_NAME_TRANSFORM;
        }
    },
    Identifier: (path) => {
        //TODO. check for parent || change above 
        if (path.node.name === "className") {
            path.node.name = CLASS_NAME_TRANSFORM;
        }

        if (path.node.name === "onClick") {
            path.node.name = RN_ON_CLICK;
        }


    },
    MemberExpression(path) {
        // @identifiers sorted from left to right: event.currentTarget.value -> [event, currentTarget, value]
        const isExpression = (node, identifiers) => {
            const identifer = identifiers.pop();
            if (node.property.name === identifer) {
                if (identifiers.length === 1 && node.object.name === identifiers[0]) {
                    return true;
                } else if (t.isMemberExpression(node.object)) {
                    return isExpression(node.object, identifiers);
                }
            }
            return false;
        };

        if (isExpression(path.node, ["event", "currentTarget", "value"])) {
            path.replaceWithSourceString(`event.nativeEvent.text`);
        }
        if (isExpression(path.node, ["nav", "userAgent", "toLowerCase"])) {
            path.parentPath.replaceWithSourceString(`false`);
            // path.replaceWithSourceString(`{name: ""}`);
        }
        if (isExpression(path.node, ["window", "document", "createElement"])) {
            // console.log(`FOUND window.document.createElement IN ${this.state.file.opts.filename}`);
        }
        // if (isExpression(path.node, ["window", "location", "hash"])) {
        //     console.log(`FOUND window.location.hash IN ${this.state.file.opts.filename}`);
        // }
        // if (isExpression(path.node, ["window", "location", "hostname"])) {
        //     console.log(`FOUND window.location.hostname IN ${this.state.file.opts.filename}`);
        // }
        if (isExpression(path.node, ["window", "location", "href"])) {
            // console.log(`FOUND window.location.href IN ${this.state.file.opts.filename}`);
        }
    }
};

const hasValueOfString = node => (t.isStringLiteral(node) || t.isLiteral(node) || t.isTemplateElement(node));
const stringValue = node => (t.isTemplateElement(node) ? node.value.raw : node.value);
const stringToMemberExpression = classNamesString => {
    const returnArr = [];
    if (!classNamesString) {
        return returnArr;
    }
    const classNames = classNamesString.split(" ");
    classNames.forEach(className => {
        className = className.trim();
        if (className !== '' && className !== ' ') {
            const memberExpression = t.memberExpression(t.identifier(STYLE_IMPORT), t.stringLiteral(className), true);
            returnArr.push(memberExpression);
        }
    });
    return returnArr;
};

const binaryExpressionNodeLeft = (nodeLeft, returnArr, previousString = "") => {
    if (hasValueOfString(nodeLeft)) {
        const classNames = stringValue(nodeLeft) + previousString;
        returnArr.push(...stringToMemberExpression(classNames));

    } else if (t.isBinaryExpression(nodeLeft)) {
        binaryExpression(nodeLeft, returnArr, previousString);

    } else if (t.isMemberExpression(nodeLeft)) {
        returnArr.push(nodeLeft);

    } else if (t.isConditionalExpression) {
        returnArr.push(conditionalExpression(nodeLeft));

    } else if (t.isCallExpression(nodeLeft)) {
        callExpression(nodeLeft, returnArr);

    } else {
        if (DEBUG_BINARY_EXPRESSION) transformError.push({ node: nodeLeft, message: 'BINARY EXPRESSION::NODE LEFT' });
    }
};

//TODO::Find a recursive way how to not write code double?? Or is this already the best recursive way
const binaryExpression = (node, returnArr, previousString = "") => {
    const nodeLeft = node.left;
    const nodeRight = node.right;
    if (node.operator === "+") {
        if (hasValueOfString(nodeRight)) {
            const result = stringValue(nodeRight) + previousString;
            binaryExpressionNodeLeft(nodeLeft, returnArr, result);

        } else if (t.isConditionalExpression(nodeRight)) {
            returnArr.push(conditionalExpression(nodeRight));
            binaryExpressionNodeLeft(nodeLeft, returnArr);

        } else if (t.isCallExpression(nodeRight)) {
            callExpression(nodeRight, returnArr);
            binaryExpressionNodeLeft(nodeLeft, returnArr);

        } else {
            if (DEBUG_BINARY_EXPRESSION) transformError.push({ node: nodeRight, message: 'BINARY EXPRESSION::NODE RIGHT' });
        }
    } else {
        if (DEBUG_BINARY_EXPRESSION) transformError.push({ node: node, message: 'BINARY EXPRESSION::OPERATOR ' + node.operator });
    }
};

const transformToValidExpression = node => {
    const returnArr = [];
    if (hasValueOfString(node)) {
        const classNames = stringValue(node);
        returnArr.push(...stringToMemberExpression(classNames));

    } else if (t.isIdentifier(node) || t.isObjectExpression(node) || t.isMemberExpression(node)) {
        returnArr.push(node);

    } else if (t.isBinaryExpression(node)) {
        binaryExpression(node, returnArr);
    }
    return returnArr;
};

const conditionalExpressionConsequentAlternate = (node, nodeDescription) => {
    const resultingNode = transformToValidExpression(node);
    if (resultingNode.length > 0) {
        if (resultingNode.length === 1) {
            return resultingNode[0];
        } else {
            return t.arrayExpression(resultingNode);
        }
        // IF:: node === ""
    } else if (t.isStringLiteral(node)) {
        return node;

    } else if (t.isConditionalExpression(node)) {
        return conditionalExpression(node);
    } else {
        if (DEBUG_CONDITINAL_EXPRESSION) transformError.push({ node: node, message: 'CONDITIONEL EXPRESSION ' + nodeDescription });
        return node;
    }
};

const conditionalExpression = (conditionalExpression) => {
    if (!(t.isMemberExpression(conditionalExpression.test)
        || t.isBinaryExpression(conditionalExpression.test)
        || t.isUnaryExpression(conditionalExpression.test)
        || t.isLogicalExpression(conditionalExpression.test)
        || t.isIdentifier(conditionalExpression.test))) {
        if (DEBUG_CONDITINAL_EXPRESSION) transformError.push({ node: conditionalExpression.test, message: 'CONDITIONEL EXPRESSION TEST' });
    }
    conditionalExpression.consequent = conditionalExpressionConsequentAlternate(conditionalExpression.consequent, 'CONSEQENT');
    conditionalExpression.alternate = conditionalExpressionConsequentAlternate(conditionalExpression.alternate, 'ALTERNATE');
    return conditionalExpression;
};

const callExpression = (callExpression, styleArr) => {
    if (t.isMemberExpression(callExpression.callee)) {
        if (callExpression.callee.property.name === "join" && callExpression.arguments.value === " ") {
            transformExpression(callExpression.callee.object, styleArr);
        } else {
            if (DEBUG_CALL_EXPRESSION) transformError.push({ node: callExpression.callee.object, message: 'CALL EXPRESSION::PROPERTY ' + callExpression.callee.property.name });
            transformExpression(callExpression.callee.object, styleArr);
            // transformError.push({ node: callExpression.callee.object, message: 'CALLEXPRESSION ' + node.operator });
            // transformError.push({ node: callExpression.callee.property, message: 'RIGHT BINARY EXPRESSION ' + node.operator });
        }
    } else {
        if (DEBUG_CALL_EXPRESSION) transformError.push({ node: callExpression.callee, message: 'CALL EXPRESSION CALLEE UNKOWN' });
    }
};

const transformExpression = (node, styleArr) => {
    const styles = transformToValidExpression(node);
    if (styles && styles.length > 0) {
        styleArr.push(...styles);

    } else if (t.isConditionalExpression(node)) {
        styleArr.push(conditionalExpression(node));

    } else if (t.isCallExpression(node)) {
        callExpression(node, styleArr);

    } else if (t.isArrayExpression(node)) {
        node.elements.forEach(element => transformExpression(element, styleArr));

    } else if (t.isSequenceExpression(node)) {
        node.expressions.forEach(expression => transformExpression(expression, styleArr));

    } else if (t.isJSXExpressionContainer(node)) {
        if (t.isTemplateLiteral(node.expression)) {
            node.expression.expressions.forEach(expression => transformExpression(expression, styleArr));
            node.expression.quasis.forEach(quasi => transformExpression(quasi, styleArr));
        } else {
            // if (!(t.isMemberExpression(node.expression) || t.isStringLiteral(node.expression)
            //     || t.isArrayExpression(node.expression) || t.isJSXExpressionContainer(node.expression)
            //     || t.isConditionalExpression(node.expression))) {
            //     loggerNode(node.expression, 'NOT SUPPORTED NODE: JSXExpressionContainer');
            // }
            transformExpression(node.expression, styleArr);
        }
    } else {
        //TODO::Make the reason for this more obvious || Remove nodes.value = "" || " " from recursion
        if (!(t.isTemplateElement(node) || t.isStringLiteral(node)) && DEBUG_ALL_EXPRESSIONS) {
            transformError.push({ node: node, message: 'transformExpression function' });
        }
    }
};

// Pushed props.className at the end of array, so the props gets always applied
const unshiftPropsClassName = (styleArr) => {
    for (const index in styleArr) {
        if (t.isMemberExpression(styleArr[index]) && styleArr[index].property.name === "className") {
            styleArr.push(styleArr.splice(index, 1)[0]);
            break;
        }
    }
};

const transformStyle = (node) => {
    const styleArr = [];
    cssTransform = true;
    transformExpression(node, styleArr);
    unshiftPropsClassName(styleArr);
    return styleArr.length === 0 ? node : styleArr.length === 1 ? styleArr[0] : t.arrayExpression(styleArr);
};

babel.traverse(ast, {
    Program: {
        enter(path, state) {
            path.traverse(processJSXElements);
            if (reactNativeImports.size > 0) {
                const specifiers = [];
                reactNativeImports.forEach(rnImport => specifiers.push(t.importSpecifier(t.identifier(rnImport), t.identifier(rnImport))));
                const importDeclaration = t.importDeclaration(specifiers, t.stringLiteral('react-native'));
                path.unshiftContainer('body', importDeclaration);
                if (DEBUG_NATIVE_IMPORT) console.log(`IMPORTED ${Array.from(reactNativeImports)} INTO ${state.file.opts.filename}`);
                reactNativeImports.clear();
            }
            if (svgImports.size > 0) {
                // const specifiers = [t.importDefaultSpecifier(t.identifier("Svg"))];
                const specifiers = [];
                svgImports.forEach(svgImport => specifiers.push(t.importSpecifier(t.identifier(svgImport), t.identifier(svgImport))));
                const importDeclaration = t.importDeclaration(specifiers, t.stringLiteral('react-native-svg'));
                path.unshiftContainer('body', importDeclaration);
                if (DEBUG_SVG_IMPORT) console.log(`IMPORTED ${Array.from(reactNativeImports)} INTO ${state.file.opts.filename}`);
                svgImports.clear();
            }

            const importSpecifier = t.importDefaultSpecifier(t.identifier(STYLE_IMPORT))
            const importDeclaration = t.importDeclaration([importSpecifier], t.stringLiteral("../" + STYLE_SHEET));
            path.unshiftContainer('body', importDeclaration);

            if (transformError.length > 0 && DEBUG_TRANSFORM) {
                const spacer = "=".repeat(25);
                console.log(`${spacer}START::FILE${spacer}`)
                while (transformError.length > 0) {
                    const error = transformError.shift();
                    const spacer = "-".repeat(25);
                    console.log(`${spacer}FILE: ${state.file.opts.filename}${spacer}`);
                    console.log(`${spacer}${error.message}${spacer}`);
                    console.log(error.node);
                    console.log(`${spacer}${error.message}${spacer}`);
                }
                console.log(`${spacer}END::FILE${spacer}`);
            }
        }
    }
});

// generate.default(ast, {}, code)
console.log(generate.default(ast, {}, code).code);