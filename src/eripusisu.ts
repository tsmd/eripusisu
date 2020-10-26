export type EripusisuOptions = {
  ellipsisText?: string;
  toggleButton?: HTMLElement;
};

type EripusisuRect = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

type EripusisuRectWithIndex = EripusisuRect & {
  nodeIndex: number;
};

export default class Eripusisu {
  private originalNodes = document.createDocumentFragment();
  private targetNodes: Node[] = [];
  private linesMemo: number[] = [];
  private rects: EripusisuRectWithIndex[] = [];
  private rectsMemo: number[] = [];
  private expanded = false;
  private isDirty = false;

  constructor(
    private container: HTMLElement,
    private lines = 3,
    private options: EripusisuOptions = {}
  ) {
    options.ellipsisText = options.ellipsisText ?? "…";

    this.prepareAttributes();
    this.bindEvents();
    this.refresh();
  }

  private prepareAttributes() {
    const randomId = "eripusisu-" + randomString();
    this.container.id = randomId;
    this.options.toggleButton?.setAttribute("aria-controls", randomId);
    this.updateAttributes();
  }

  private bindEvents() {
    this.options.toggleButton?.addEventListener("click", (e) => {
      e.preventDefault();
      this.toggle();
    });
  }

  private updateAttributes() {
    this.options.toggleButton?.setAttribute(
      "aria-expanded",
      String(this.expanded)
    );
  }

  refresh() {
    this.revertToOriginalNodes();

    const childNodes = this.container.childNodes;
    this.originalNodes = document.createDocumentFragment();
    for (let i = 0; i < childNodes.length; i += 1) {
      this.originalNodes.appendChild(childNodes[i].cloneNode(true));
    }

    this.targetNodes = this.collectTargetNodes();
    this.prepareRects();

    if (this.linesMemo.length > this.lines) {
      this.truncate();
    }
  }

  private collectTargetNodes() {
    return collectNodes(this.container, (node) => {
      return (
        (node instanceof HTMLElement &&
          ["IMG", "PICTURE", "SVG"].indexOf(node.tagName) >= 0) ||
        (node instanceof Text && node.textContent!.trim() !== "")
      );
    });
  }

  private emptyTarget() {
    this.container.innerHTML = "";
  }

  private revertToOriginalNodes() {
    if (this.isDirty) {
      this.emptyTarget();
      this.container.appendChild(this.originalNodes.cloneNode(true));
      this.isDirty = false;
    }
  }

  private prepareRects() {
    this.rects = [];
    this.rectsMemo = [0];
    this.linesMemo = [];

    let currentLine = 0;
    const rectTraverser = new RectTraverser((rect, index, lineCount) => {
      if (currentLine < lineCount) {
        currentLine = lineCount;
        this.linesMemo.push(index);
      }
      if (lineCount > this.lines + 1) {
        return true;
      }
    });

    for (let i = 0; i < this.targetNodes.length; i += 1) {
      const node = this.targetNodes[i];

      const range = document.createRange();
      range.selectNode(node);

      const rects = this.getRectsFromRange(range, node);
      this.rectsMemo.push(
        this.rectsMemo[this.rectsMemo.length - 1] + rects.length
      );
      for (let j = 0; j < rects.length; j += 1) {
        const rect = rects[j];
        rect.nodeIndex = i;
        this.rects.push(rect);

        const pushResult = rectTraverser.push(rect);
        if (pushResult) {
          return;
        }
      }
    }
  }

  private getRectsFromRange(range, node) {
    const rects = [];
    const domRects = range.getClientRects();
    const nearestScrollTop = getNearestScrollTop(node);
    for (let i = 0; i < domRects.length; i += 1) {
      const { top, right, bottom, left, width, height } = domRects[i];
      rects.push({
        top: top + nearestScrollTop,
        right,
        bottom: bottom + nearestScrollTop,
        left,
        width,
        height,
      });
    }
    return rects;
  }

  private isRectsWithinLines(rects, lines) {
    let flag = true;
    new RectTraverser((rect, index, lineCount) => {
      if (lines < lineCount) {
        flag = false;
        return false;
      }
    }, rects);
    return flag;
  }

  private truncate() {
    this.isDirty = true;

    // 試行中のパフォーマンス向上
    // @ts-ignore
    this.container.style.contain = "strict";
    this.container.style.height = "0";
    const teardown = () => {
      // @ts-ignore
      this.container.style.contain = "";
      this.container.style.height = "";
    };

    // 文字長を調整する対象の DOMRect のインデックス
    const targetRectIndex = Math.max(0, this.linesMemo[this.lines]);

    let targetNode;
    let targetText;
    let resultLength = -1;

    // 対象ノードを遡りながらテキストの truncate を試みる
    for (
      let targetNodeIndex = this.rects[targetRectIndex].nodeIndex;
      targetNodeIndex >= 0;
      targetNodeIndex -= 1
    ) {
      targetNode = this.targetNodes[targetNodeIndex];

      // テキストノードでなければテキスト処理ができないので、ここで終了
      if (!(targetNode instanceof Text)) {
        if (targetNodeIndex === this.rects[targetRectIndex].nodeIndex) {
          continue;
        } else {
          break;
        }
      }

      targetText = targetNode.textContent;

      // 対象ノードより手前の DOMRect は再利用する
      const rects = this.rects.slice(0, this.rectsMemo[targetNodeIndex]);

      const isRectsWithinLines = (textPost) => {
        targetNode.textContent =
          targetText.slice(0, textPost) + this.options.ellipsisText;

        const range = document.createRange();
        range.setStart(targetNode, 0);
        range.setEnd(targetNode, targetNode.textContent.length);

        const testRects = [
          ...rects,
          ...this.getRectsFromRange(range, targetNode),
        ];
        return this.isRectsWithinLines(testRects, this.lines);
      };

      // 省略文字のみにしても収まらない場合、ここで終了
      if (!isRectsWithinLines(0)) {
        continue;
      }

      // 二分探索法で行内に収まるテキスト量を探る
      resultLength = binarySearchBetween(0, targetText.length, (pos) => {
        return isRectsWithinLines(pos) ? -1 : 1;
      });

      // 行内におさまればその時点で終了
      if (resultLength >= 0) {
        break;
      }
    }

    const resultRange = document.createRange();
    resultRange.setStartBefore(this.container.firstChild);

    if (targetNode instanceof Text) {
      if (resultLength < 0) {
        return teardown();
      }
      targetNode.textContent =
        targetText.slice(0, resultLength) + this.options.ellipsisText;
      resultRange.setEnd(targetNode, targetNode.textContent.length);
    } else {
      resultRange.setEndAfter(targetNode);
    }

    const resultContents = resultRange.cloneContents();

    this.emptyTarget();
    this.container.appendChild(resultContents);

    teardown();
  }

  toggle() {
    this.expanded = !this.expanded;
    if (this.expanded) {
      this.revertToOriginalNodes();
    } else {
      this.refresh();
    }
    this.updateAttributes();
  }
}

class RectTraverser {
  private lineCount = 0;
  private lastTop = -Infinity;
  private lastRight = Infinity;

  /**
   * @param {Function} callback
   * @param {DOMRect[]} rects
   */
  constructor(private callback, private rects = []) {
    for (let i = 0; i < rects.length; i += 1) {
      const rect = rects[i];
      const result = this.process(rect, i);
      if (result === false) {
        break;
      }
    }
  }

  push(rect) {
    this.rects.push(rect);
    return this.process(rect, this.rects.length - 1);
  }

  process(rect, i) {
    // 改行があったとみなす条件
    if (this.lastTop + 10 < rect.top && this.lastRight > rect.left) {
      this.lineCount += 1;
    }
    this.lastTop = rect.top;
    this.lastRight = rect.right;

    return this.callback(rect, i, this.lineCount);
  }
}

function binarySearchBetween(from, to, compareFn) {
  let temp = -1;
  while (from <= to) {
    const middle = (from + to) >> 1;
    const result = compareFn(middle);
    if (result === 0) {
      return middle;
    }
    if (result > 0) {
      to = middle - 1;
    } else {
      temp = middle;
      from = middle + 1;
    }
  }
  return temp;
}

function collectNodes(node, predicate) {
  const length = node.childNodes.length;
  if (predicate(node)) {
    return [node];
  }
  const collection = [];
  for (let i = 0; i < length; i += 1) {
    const deep = collectNodes(node.childNodes[i], predicate);
    collection.push.apply(collection, deep);
  }
  return collection;
}

function getNearestScrollTop(targetEl) {
  for (let currentEl = targetEl; currentEl; currentEl = currentEl.parentNode) {
    if (currentEl.scrollTop > 0) {
      return currentEl.scrollTop;
    }
  }
  return 0;
}

function randomString() {
  return Math.random().toString(36).slice(2);
}
