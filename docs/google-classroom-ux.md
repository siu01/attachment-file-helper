# Google Classroom の使いにくさ調査

調査日: 2026-10-09

## 見つかった課題

| 課題 | この拡張機能での対応 | 対応状況 |
| --- | --- | --- |
| ストリームや通知が増えると、過去の投稿・課題を探しにくい | 現在のページ内検索 | 実装済み |
| 添付ファイルを一度開かないと保存しにくい | 右クリックの直接保存 | 実装済み |
| 1つの投稿に複数ファイルがあると保存操作が多い | フォルダへの一括保存 | 実装済み |
| 後で確認したい課題・投稿を再発見しにくい | Classroom ページのローカル保存 | 実装済み |
| 全クラスの締切・未提出・成績を一か所で確認したい | Classroom API と認証が必要 | 未実装 |
| 通知やコメントだけを整理して確認したい | Classroom API または DOM 依存の大規模実装が必要 | 未実装 |

## 参考にした情報

- [Classroom ヘルプ: 課題を提出する](https://support.google.com/edu/classroom/answer/6020285?hl=ja)
- [Classroom ヘルプ: 添付ファイルの共有の仕組み](https://support.google.com/edu/classroom/answer/6020260?hl=ja)
- [Google Classroom の利用者レビュー](https://apps.apple.com/jp/app/google-classroom/id924620788?platform=iphone&see-all=reviews)
- [User Experience Analysis of Google Classroom in Online Learning](https://www.researchgate.net/publication/406196778_User_Experience_Analysis_of_Google_Classroom_in_Online_Learning)

利用者の不満は学校・教師・生徒・端末によって異なるため、レビューや調査結果は傾向として扱い、特定の学校アカウントの情報を収集しない設計にしています。
