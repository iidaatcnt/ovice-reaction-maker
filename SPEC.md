# Ovice Reaction Maker - 技術仕様書 (SPEC)

## 概要
Ovice 等のバーチャルオフィスツールで利用するための、アニメーション GIF リアクションを作成する Web アプリケーション。

## 技術スタック
- **Framework**: Next.js (App Router)
- **Styling**: Tailwind CSS
- **Library**: `gifenc` (GIF エンコード)
- **Deployment**: Vercel

## 主要機能
1. **テキストカスタマイズ**
   - リアルタイムプレビュー
   - 日本語フォント対応 (M PLUS 2 等のシステムフォントフォールバック)
   - 文字サイズの手動調整 (+/- オフセット)
2. **アニメーション**
   - Pulse (パルス（鼓動）)
   - Spin (回転)
   - Rainbow (レインボー)
   - Shake (シェイク（揺れ）)
   - Slide (スライド)
   - Bounce (バウンス（跳ねる）)
   - Grow (拡大・縮小)
   - Blink (点滅)
3. **背景デザイン**
   - パターン描画 (None, Heart, Star, Burst, Bubble)
   - 背景色/透明度の切り替え
4. **出力設定**
   - 推奨サイズプリセット (300x200, 200x200, 256x60)
   - 再生時間の設定 (0.5s - 5.0s)

## アーキテクチャ
- `app/page.tsx`: メインコンポーネント。状態管理 (useState) と Canvas 描画ロジックを含む。
- `renderFrame`: CanvasRenderingContext2D を使用して 1 フレームを描画する useCallback 関数。
- `handleDownload`: `gifenc` を使用して全フレームをキャプチャし、GIF ファイルとして出力する。

## 開発ノート
- **高解像度対応**: デバイスピクセル比を考慮した描画。
- **透明 GIF**: `gifenc` のパレットから透明色を指定して出力。
- **デザイン**: ライトモードをベースにした、清潔感のある UI デザイン。
