(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Eripusisu = factory());
}(this, (function () { 'use strict';

    var Eripusisu = /** @class */ (function () {
        function Eripusisu(container, lines, options) {
            if (lines === void 0) { lines = 3; }
            if (options === void 0) { options = {}; }
            var _a, _b;
            this.container = container;
            this.lines = lines;
            this.options = options;
            this.originalNodes = document.createDocumentFragment();
            this.targetNodes = [];
            this.linesMemo = [];
            this.rects = [];
            this.rectsMemo = [];
            this.expanded = true;
            this.expanded = (_a = options.expanded) !== null && _a !== void 0 ? _a : false;
            options.ellipsisText = (_b = options.ellipsisText) !== null && _b !== void 0 ? _b : "…";
            this.handleClick = this.handleClick.bind(this);
            this.prepareAttributes();
            this.bindEvents();
            this.rebuild();
            this.refresh();
        }
        Eripusisu.prototype.prepareAttributes = function () {
            var _a;
            var randomId = "eripusisu-" + randomString();
            this.container.id = randomId;
            (_a = this.options.toggleButton) === null || _a === void 0 ? void 0 : _a.setAttribute("aria-controls", randomId);
            this.updateAttributes();
        };
        Eripusisu.prototype.bindEvents = function () {
            var _a;
            (_a = this.options.toggleButton) === null || _a === void 0 ? void 0 : _a.addEventListener("click", this.handleClick);
        };
        Eripusisu.prototype.unbindEvents = function () {
            var _a;
            (_a = this.options.toggleButton) === null || _a === void 0 ? void 0 : _a.removeEventListener("click", this.handleClick);
        };
        Eripusisu.prototype.handleClick = function (e) {
            e.preventDefault();
            this.toggle();
        };
        Eripusisu.prototype.updateAttributes = function () {
            var _a;
            var attrToAdd = this.expanded
                ? "eripusisu-expanded"
                : "eripusisu-collapsed";
            var attrToRemove = this.expanded
                ? "eripusisu-collapsed"
                : "eripusisu-expanded";
            this.container.setAttribute(attrToAdd, "");
            this.container.removeAttribute(attrToRemove);
            (_a = this.options.toggleButton) === null || _a === void 0 ? void 0 : _a.setAttribute("aria-expanded", String(this.expanded));
        };
        Eripusisu.prototype.dispatchToggleEvent = function () {
            var event = document.createEvent("CustomEvent");
            event.initCustomEvent("eripusisu-toggle", true, false, this.expanded);
            this.container.dispatchEvent(event);
        };
        Eripusisu.prototype.emptyTarget = function () {
            this.container.innerHTML = "";
        };
        Eripusisu.prototype.revertToOriginalNodes = function () {
            this.emptyTarget();
            this.container.appendChild(this.originalNodes.cloneNode(true));
            this.targetNodes = collectNodes(this.container, function (node) {
                return ((node instanceof HTMLElement &&
                    ["IMG", "PICTURE", "SVG"].indexOf(node.tagName) >= 0) ||
                    (node instanceof Text && node.textContent.trim() !== ""));
            });
        };
        Eripusisu.prototype.prepareRects = function () {
            var _this = this;
            this.rects = [];
            this.rectsMemo = [0];
            this.linesMemo = [];
            var currentLine = 0;
            var rectTraverser = new RectTraverser(function (rect, index, lineCount) {
                if (currentLine < lineCount) {
                    currentLine = lineCount;
                    _this.linesMemo.push(index);
                }
                if (lineCount > _this.lines + 1) {
                    return true;
                }
            });
            for (var i = 0; i < this.targetNodes.length; i += 1) {
                var node = this.targetNodes[i];
                var range = document.createRange();
                range.selectNode(node);
                var rects = this.getRectsFromRange(range, node);
                this.rectsMemo.push(this.rectsMemo[this.rectsMemo.length - 1] + rects.length);
                for (var j = 0; j < rects.length; j += 1) {
                    var rect = rects[j];
                    rect.nodeIndex = i;
                    this.rects.push(rect);
                    var pushResult = rectTraverser.push(rect);
                    if (pushResult) {
                        return;
                    }
                }
            }
        };
        Eripusisu.prototype.getRectsFromRange = function (range, node) {
            var rects = [];
            var domRects = range.getClientRects();
            var nearestScrollTop = getNearestScrollTop(node);
            for (var i = 0; i < domRects.length; i += 1) {
                var _a = domRects[i], top_1 = _a.top, right = _a.right, bottom = _a.bottom, left = _a.left, width = _a.width, height = _a.height;
                rects.push({
                    top: top_1 + nearestScrollTop,
                    right: right,
                    bottom: bottom + nearestScrollTop,
                    left: left,
                    width: width,
                    height: height,
                });
            }
            return rects;
        };
        Eripusisu.prototype.isRectsWithinLines = function (rects, lines) {
            var flag = true;
            new RectTraverser(function (rect, index, lineCount) {
                if (lines < lineCount) {
                    flag = false;
                    return false;
                }
            }, rects);
            return flag;
        };
        Eripusisu.prototype.truncate = function () {
            var _this = this;
            if (this.linesMemo.length <= this.lines) {
                return;
            }
            // 試行中のパフォーマンス向上
            // @ts-ignore
            this.container.style.contain = "strict";
            this.container.style.height = "0";
            var teardown = function () {
                // @ts-ignore
                _this.container.style.contain = "";
                _this.container.style.height = "";
            };
            // 文字長を調整する対象の DOMRect のインデックス
            var targetRectIndex = Math.max(0, this.linesMemo[this.lines]);
            var targetNode;
            var targetText;
            var resultLength = -1;
            var _loop_1 = function (targetNodeIndex) {
                targetNode = this_1.targetNodes[targetNodeIndex];
                // テキストノードでなければテキスト処理ができないので、ここで終了
                if (!(targetNode instanceof Text)) {
                    if (targetNodeIndex === this_1.rects[targetRectIndex].nodeIndex) {
                        return "continue";
                    }
                    else {
                        return "break";
                    }
                }
                targetText = targetNode.textContent;
                // 対象ノードより手前の DOMRect は再利用する
                var rects = this_1.rects.slice(0, this_1.rectsMemo[targetNodeIndex]);
                var isRectsWithinLines = function (textPost) {
                    targetNode.textContent =
                        targetText.slice(0, textPost) + _this.options.ellipsisText;
                    var range = document.createRange();
                    range.setStart(targetNode, 0);
                    range.setEnd(targetNode, targetNode.textContent.length);
                    var testRects = [];
                    testRects.push.apply(testRects, rects);
                    testRects.push.apply(testRects, _this.getRectsFromRange(range, targetNode));
                    return _this.isRectsWithinLines(testRects, _this.lines);
                };
                // 省略文字のみにしても収まらない場合、ここで終了
                if (!isRectsWithinLines(0)) {
                    return "continue";
                }
                // 二分探索法で行内に収まるテキスト量を探る
                resultLength = binarySearchBetween(0, targetText.length, function (pos) {
                    return isRectsWithinLines(pos) ? -1 : 1;
                });
                // 行内におさまればその時点で終了
                if (resultLength >= 0) {
                    return "break";
                }
            };
            var this_1 = this;
            // 対象ノードを遡りながらテキストの truncate を試みる
            for (var targetNodeIndex = this.rects[targetRectIndex].nodeIndex; targetNodeIndex >= 0; targetNodeIndex -= 1) {
                var state_1 = _loop_1(targetNodeIndex);
                if (state_1 === "break")
                    break;
            }
            var resultRange = document.createRange();
            resultRange.setStartBefore(this.container.firstChild);
            if (targetNode instanceof Text) {
                if (resultLength < 0) {
                    return teardown();
                }
                targetNode.textContent =
                    targetText.slice(0, resultLength) + this.options.ellipsisText;
                resultRange.setEnd(targetNode, targetNode.textContent.length);
            }
            else {
                resultRange.setEndAfter(targetNode);
            }
            var resultContents = resultRange.cloneContents();
            this.emptyTarget();
            this.container.appendChild(resultContents);
            teardown();
        };
        Eripusisu.prototype.rebuild = function () {
            this.originalNodes = document.createDocumentFragment();
            while (this.container.firstChild) {
                this.originalNodes.appendChild(this.container.firstChild);
            }
            this.revertToOriginalNodes();
        };
        Eripusisu.prototype.refresh = function () {
            if (this.expanded) {
                this.expand();
            }
            else {
                this.collapse();
            }
        };
        Eripusisu.prototype.toggle = function (mode) {
            var expand = mode !== null && mode !== void 0 ? mode : !this.expanded;
            expand ? this.expand() : this.collapse();
        };
        Eripusisu.prototype.expand = function () {
            this.revertToOriginalNodes();
            this.expanded = true;
            this.updateAttributes();
            this.dispatchToggleEvent();
        };
        Eripusisu.prototype.collapse = function () {
            this.revertToOriginalNodes();
            this.prepareRects();
            this.truncate();
            this.expanded = false;
            this.updateAttributes();
            this.dispatchToggleEvent();
        };
        Eripusisu.prototype.destroy = function () {
            this.revertToOriginalNodes();
            this.unbindEvents();
        };
        return Eripusisu;
    }());
    var RectTraverser = /** @class */ (function () {
        /**
         * @param {Function} callback
         * @param {DOMRect[]} rects
         */
        function RectTraverser(callback, rects) {
            if (rects === void 0) { rects = []; }
            this.callback = callback;
            this.rects = rects;
            this.lineCount = 0;
            this.lastTop = -Infinity;
            this.lastRight = Infinity;
            for (var i = 0; i < rects.length; i += 1) {
                var rect = rects[i];
                var result = this.process(rect, i);
                if (result === false) {
                    break;
                }
            }
        }
        RectTraverser.prototype.push = function (rect) {
            this.rects.push(rect);
            return this.process(rect, this.rects.length - 1);
        };
        RectTraverser.prototype.process = function (rect, i) {
            // 改行があったとみなす条件
            if (this.lastTop + 10 < rect.top && this.lastRight > rect.left) {
                this.lineCount += 1;
            }
            this.lastTop = rect.top;
            this.lastRight = rect.right;
            return this.callback(rect, i, this.lineCount);
        };
        return RectTraverser;
    }());
    function binarySearchBetween(from, to, compareFn) {
        var temp = -1;
        while (from <= to) {
            var middle = (from + to) >> 1;
            var result = compareFn(middle);
            if (result === 0) {
                return middle;
            }
            if (result > 0) {
                to = middle - 1;
            }
            else {
                temp = middle;
                from = middle + 1;
            }
        }
        return temp;
    }
    function collectNodes(node, predicate) {
        var length = node.childNodes.length;
        if (predicate(node)) {
            return [node];
        }
        var collection = [];
        for (var i = 0; i < length; i += 1) {
            var deep = collectNodes(node.childNodes[i], predicate);
            collection.push.apply(collection, deep);
        }
        return collection;
    }
    function getNearestScrollTop(targetEl) {
        for (var currentEl = targetEl; currentEl; currentEl = currentEl.parentNode) {
            if (currentEl.scrollTop > 0) {
                return currentEl.scrollTop;
            }
        }
        return 0;
    }
    function randomString() {
        return Math.random().toString(36).slice(2);
    }

    return Eripusisu;

})));
