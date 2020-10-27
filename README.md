# Eripusisu

テキスト省略表示ライブラリ。  
Text truncation library.

## 特長

- 指定行数より後のテキストを省略表示する
- 指定行数がリンクやリストの途中でも大丈夫
- 内容の一部が float していても大丈夫
- 省略文字列を指定可能（複数文字可）
- アクセシビリティに配慮
- RTL 言語サポート

## 動作例

[デモ Demo](https://tsmd.github.io/eripusisu/examples.html)

## インストール

### script 要素で読み込む

```html
<script src="https://unpkg.com/eripusisu@1.1.2/dist/eripusisu.umd.js"></script>
```

### npm パッケージを利用する

```
npm install --save Eripusisu
```

```js
var Eripusisu = require("eripusisu");
```

## 使いかた

次のような HTML を想定して解説しています。

```html
<div class="container">
  <!-- 任意の省略対象の要素（群） -->
</div>
<button class="button">開閉</button>

<div class="container">
  <!-- 任意の省略対象の要素（群） -->
</div>
<button class="button">開閉</button>

:
:
```

### シンプルな省略表示

省略表示をしたいコンテンツを含むコンテナー要素を取得し、`Eripusisu` コンストラクタ―の第１引数に渡します。第２引数には省略表示にする行数を指定します。

```js
// 省略表示をしたいコンテンツを含むコンテナー要素を取得する
var container = document.querySelector(".container");

// Eripusisu を実行する（３行で省略）
new Eripusisu(container, 3);
```

jQuery:

```js
new Eripusisu($container$(".container")[0], 3);
```

### クラス名から複数のコンテナーを省略表示

```js
// 省略表示をしたいコンテンツを含むコンテナー要素を取得する
var containers = document.querySelectorAll(".container");

// ループを利用して Eripusisu を実行する
for (var i = 0; i < containers.length; i += 1) {
  new Eripusisu(containers[i], 3);
}
```

jQuery:

```js
$(".containers").each(function () {
  new Eripusisu(this, 3);
})
```

### 開閉ボタン

第３引数の `toggleButton` プロパティに要素を渡すことで開閉ボタンが動作します。

```js
// 省略表示をしたいコンテンツを含むコンテナー要素を取得する
var container = document.querySelector(".container");

// ボタン要素を取得する
var button = document.querySelector(".button");

// Eripusisu を実行する
new Eripusisu(container, 3, { toggleButton: button });
```

jQuery:

```js
// 省略表示をしたいコンテンツを含むコンテナー要素を取得する
var container = document.querySelector(".container");

// ボタン要素を取得する
var button = document.querySelector(".button");

// Eripusisu を実行する
new Eripusisu(container, 3, { toggleButton: button });
```

### 幅の変化に追随させる

設計上、幅の変化には自動的に追随しません。必要があれば、`resize` イベントをハンドリングするなどして `refresh()` メソッドを呼び出します。

```js
var eripusisu = new Eripusisu(container, 3);

window.addEventListener("resize", function () {
  eripusisu.refresh();
})
```

## API

### コンストラクタ

```js
new Eripusisu(container, lines, options);
```

| パラメーター | 必須  | 説明                                           |
| ------------ | :---: | ---------------------------------------------- |
| `container`  |   ✔   | 省略表示をしたいコンテンツを含むコンテナー要素 |
| `lines`      |   ✔   | 省略表示する行数                               |
| `options`    |       | オプション。後述                               |

#### オプション

`Eripusisu` コンストラクタは第３引数にオプションを受け取ります。

| オプション名   | 型          | 説明                                                                                              |
| -------------- | ----------- | ------------------------------------------------------------------------------------------------- |
| `expanded`     | boolean     | 初期状態の開閉状態をあらわします。`true` にすると初期状態で開いた状態になります。初期値は `false` |
| `ellipsisText` | string      | 省略をあらわす文字列。複数文字を指定することも可能です。初期値は `"…"`                            |
| `toggleButton` | HTMLElement | 開閉に使用するボタン。初期値は `undefined`                                                        |
| `rtl`          | boolean     | RTL 言語（右から左に記述する言語）のときに `true` にする。初期値は `false`                        |

### メソッド

| メソッド名 | 説明                                                                                                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------- |
| `toggle`   | 呼び出すごとに交互に開閉します。引数に boolean を渡すと開閉方向を指定できます。                                   |
| `expand`   | 開きます。すでに開いている場合、何もしません。                                                                    |
| `collapse` | 閉じます。すでに閉じている場合、何もしません。                                                                    |
| `refresh`  | 画面表示にあわせて省略位置を算出しなおします。画面や要素の大きさが変わったら `refresh` を呼び出す必要があります。 |
| `rebuild`  | DOM の変化には自動的に追随しません。コンテナーに含まれる要素が変わったら `rebuild` を呼び出す必要があります。     |

## イベント

| イベント名         | 説明                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `eripusisu-toggle` | 開閉状態がトグルされたときに発火します。<br />イベントオブジェクトの `detail` プロパティから開閉状態がわかります。 |


## サポートブラウザ

- 各種モダンブラウザ
- Internet Explorer 11

## 利用上の注意

最大限のパフォーマンスを発揮するように設計していますが、仕組み上、極めて軽快に動作するとは言えません。ページ内に多数の折りたたみ要素があるとユーザー体験を損ねる可能性があります。

## ライセンス License

MIT
