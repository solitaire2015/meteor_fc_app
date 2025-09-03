This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


todo:
1. [done]leadboard use current year as default and can select other years.
2. [done] fix the issue that in game detail page to use real data.
3. [done]fix the game stats problem.
4. if the goal plays for the whole match, the status should not be '未参与'
5. add a return button at the top left corner of the player info page.
6. adjust the div location of the year selector in player info page.
7. make the recent matches can redirect to the game detail page. 
8. add the 'return to the home page' button to ever page, maybe a common header.
9. show the first two characters of the shortId as the temporal avatar.
10, round the fee in float with 2 percision.
11. add the join date in player info page.
12. extend the position to more specific positions, also use some icons or more beautiful components to show the position.
13. [critical] add attendance list for the match, the attendance is not the player who plays, it's the player who attendant the match, it would be convenient for the admin that he can select the player in the grid., and it would be convenient for the admin to have a stright sight of which player play time. the attendance list for each match is a set, when the admin manully edit the game, especiall in the grid, he can select players from the set, previouslly the admin would select players from all teammates, but for most matches, only a part of the teammates would join the game. and the times of the player attendant the game is the sum of the player join the match instead of he plays.
14. refine the recent games list in player info page.
15. create a page for players to allow them edit their information. The editable fields should discuss in detail.
16. add all time data for players and leaderboard. All time in the team history.



Before we go the phase 2, I want to implement one last important feature, because now our original game data is saved in the excel table, and the data is written by human, and the player may have several alias name. What I want to implement is: upload the excel file of the game detail, and can export from the app, in the @data_for_explanation/meteor_fc_data.xlsx is an excel table of the original data, the sheet name is the game title, it seems it doesn't contain the time, only the date, it's OK, we can just leave it, the main problem to import from this table is that the player name may be different in differen game, for example, in this table row 1, the name is "东辉", in other games, it may be "李东辉", "辉子", the problem is exist in the history data, and for the future data, I can ask the admin who write the table to follow the rule to note the player with unique name or with an ID.
Here is my idea: create a short id for each player, like the id you created in the app, for example DK for Derick, and to overcome the conflict, add a number index to the id, e.g. dk01, where 0,1 can count from 0~9, in this format, we have enough player short id. For the history data, I can use LLM to roughly add the short id for each player in the table, and check it manully, fill the failed or blank data, so that I can have a correct data.
And there is another potential issue, the new game may have some new coming players, which is not exist in the player list, there are two ways to handle this, 1. create the player automatically, 2. show a warning message, that the new player is not exist, the admin would leave the short id for the player with blank, he may decide to create ghost player first, or just leave it blank. I think in the first phase, we don't need create the player automatically, it's too complicated, maybe when the user and the admin use the app for a time period, he can raise the habbit to use the app directlly without using the excel.
The export function is simply export the game detail to the excel table like this, the player short id should also be included.

That's the purposed feature, do you understand the requirement? Do you have questions? Let's discuss it to crystal clear before we go implement it.


We just import the attendance and event, late, note, total field fee, water fee, for the fee of each player, we already have the logic to automatically calculate it, it's a good chance to test our logic, if the calculated result of the app is same with the table, it's correct.

for the questions:
1. Can you read the excel directlly? if not, I can describe the structure for you.
2. auto-generate, refer to the excel, it the player name is three Chinese characters, use the last two characters, for example, 李东辉->dh
3. I think we don't do that, it's a temporary feature, we only show a warning message, and give the admin ablity to remove the game/detail, so that he can manully update or upload the data.
4. just leave the missing data, if the field is requrired, set a default value, if you can't read the excel, I can show you the structure.

if '准时到场' == 1, the player is not late for the game,
the final score is not extracted, it should be 3:5
field fee and water fee is not extracted, the fee coffeicient is not extracted, the coffeicient is constant for a single game.
That's all the issues I found, please help me fix it

the dialog info of the delete confirm you use is the default component, do not use default component, it's ugly and not friendly for mobile use, use a good library compont insted.

Your concern is reasonable, let me explain
1. if we set the attendance = 1 for goalkeepers would not affect the fee calculation, we already a good algorithm for the fee calculation, if the play time is 1 and the goalkeeperi is true, the player would not be charget the field fee.
2. the excel is only a temporal save solution, eventhough in the excel table, the time of the goalkeeper is marked as 0, we can simplily add the logic to detect the goalkeeper field and convert it to 1. if we just it as 0, there would be a mismatch between the upload excel way and manully create way, for upload excel match data in the system, the time of goalkeeper is 0, and for manully create data in system, the time of the goalkeeper is 1, it's not correct, it should be act in same way.
3. No, attendance = 1 + goalkeeper = true means the player plays as goalkeeper, the goalkeeper can also plays as a normal player, in this way, the meta data would be like attendance = 1, goalkeeper = false.

Don't worry about the algorithm of charging the fee of goalkeepers, we already a correct algorithm. 
Do you understand my explanation? is there any unclear questions?