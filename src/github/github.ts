import express, { type Request } from 'express';
import {
	handeLabelUpdated,
	handleClosed,
	handleCommentDeleted,
	handleCreated,
	handleDeleted,
	handleLocked,
	handleOpened,
	handleReopened,
	handleUnlocked
} from './githubHandlers';

const app = express();
app.use(express.json());

const githubActions: {
	[key: string]: (req: Request) => void;
} = {
	opened: (req) => handleOpened(req),
	created: (req) => handleCreated(req),
	closed: (req) => handleClosed(req),
	reopened: (req) => handleReopened(req),
	locked: (req) => handleLocked(req),
	unlocked: (req) => handleUnlocked(req),
	labeled: (req) => handeLabelUpdated(req),
	unlabeled: (req) => handeLabelUpdated(req),
	deleted: (req) => (req.body.comment ? handleCommentDeleted(req) : handleDeleted(req))
};

export function initGithub() {
	app.get('', (_, res) => {
		res.json({ msg: 'github webhooks work' });
	});

	app.post('/', async (req, res) => {
		const githubAction = githubActions[req.body.action];
		githubAction && githubAction(req);
		res.json({ msg: 'ok' });
	});

	const PORT = process.env.PORT || 5000;
	app.listen(PORT, () => {
		console.log(`Server is running on port ${PORT}`);
	});
}

export default app;
