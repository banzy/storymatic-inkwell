/**
 * "The City of Ashes" — the labelled sample project.
 *
 * The prose is original. Nothing here establishes Marcus's motive: the author's
 * planned intention is stored separately as an unwritten direction.
 */

export const SAMPLE_TITLE = "The City of Ashes";
export const SAMPLE_GENRE = "Literary suspense";
export const SAMPLE_DIRECTION_SUMMARY =
  "A quiet city after a failed strike. Trust is the scarce commodity, not information.";

export type SampleScene = {
  key: string;
  title: string;
  summary: string;
  pov: string;
  location: string;
  storyTime: string;
  body: string;
};

export const SAMPLE_CHAPTER_TITLE = "Chapter One — Ash Week";

export const SAMPLE_SCENES: SampleScene[] = [
  {
    key: "letter",
    title: "The Letter",
    summary: "Elena asks Marcus to carry a letter out of the district before curfew.",
    pov: "Marcus",
    location: "Elena's rooms above the print shop",
    storyTime: "Ash Week, Tuesday evening",
    body: `The lamp on Elena's desk had been trimmed too low, and she did not raise it when Marcus came in. She only turned the letter face down, which told him more than the letter would have.

"Shut the door," she said. "The stairs carry."

He shut it. Outside, the print shop was cooling; he could smell the ink going tacky in the trays, and under that the sourness the city had worn since the strike failed — wet paper, wet ash, the river running grey past the mills.

"You look like a man who has been walking," Elena said.

"I've been walking."

"Then a little further won't ruin you." She slid the letter across the desk, still face down, and kept two fingers on it a moment longer than she needed to. "This goes out of the district tonight. Before the bells. Not through the post house, not through Tomas, not through anyone who drinks on Vessel Street."

Marcus looked at the letter. Cheap paper, folded twice, sealed with candle wax rather than a stamp — the seal of someone who did not want to be traced by their own device.

"Who reads it?" he asked.

"The person I give it to reads it."

"That isn't an answer, Elena."

"No." She almost smiled. In the low light the lines at her mouth looked older than she was, and he understood that she had been sitting here a long time before he arrived, deciding whether to ask him at all. "It isn't. Will you take it anyway?"

He should have said something. He had rehearsed something on the stairs, a small clean lie, and it deserted him.

"I'll take it," he said.

Elena let go of the letter.

"If they stop you," she said, "it's a bill of lading. You're a clerk, you're stupid, you're sorry. They like sorry."

"And if they open it?"

"Then I will have been wrong about the paper, and about you, and one of those I can survive." She stood and moved to the window, not to look out — the shutters were closed — but to stand where she did not have to watch him put it away. "Marcus. There are four people left I would trust with this."

"Name them."

"No," she said. "It would be a short and frightening list."

He put the letter inside his coat, against the lining, where the weight of it was indistinguishable from the weight of anything else a man might carry. Then he went down the cold stairs and out into the ash, and the bells had not rung yet, and the street was empty in both directions.`,
  },
  {
    key: "mara",
    title: "What Mara Asks",
    summary: "Mara stops Marcus at the yard gate. He keeps the letter out of the conversation.",
    pov: "Marcus",
    location: "The coal yard gate, Fenn Street",
    storyTime: "Ash Week, Tuesday, later",
    body: `Mara was waiting at the yard gate with her coat buttoned wrong, which meant she had left somewhere quickly.

"You've come from Elena," she said.

"I've come from the shop."

"That is the same sentence with fewer teeth." She fell into step beside him, and he adjusted — a half stride shorter, so she would not have to hurry, so that his coat would not swing.

The yard lamps were out. Somebody had been taking the glass for weeks and nobody had been sent to stop them, which was its own kind of news about the district.

"She's thin," Mara said. "Have you looked at her?"

"I've looked at her."

"She eats when other people are eating and then she stops. Last winter she'd have told me that herself." Mara pushed her hands into her sleeves. "Now she tells me the weather."

"She's careful."

"She's frightened, and she has decided being frightened alone is a virtue." Mara stopped walking. Ahead, the gate hung open on one hinge, and past it the road went down towards the water and the low houses. "Marcus. Is she planning something?"

Inside his coat the letter lay flat against his ribs. He was aware of it the way one is aware of a bruise: not pain, only the knowledge that a place exists which must not be pressed.

"She's always planning something," he said. "It's how she rests."

Mara studied him. She had a way of waiting that was not silence exactly; it was more like leaving a door open in a cold room.

"If she asks you to do something," she said at last, "will you tell me?"

"I'd have to know it was worth telling."

"That is not the same as yes."

"No," he agreed.

She let out a breath and looked away, down the hill, and for a moment she seemed simply tired rather than suspicious, a woman who had been awake since the whistles. "There were men on Vessel Street this afternoon," she said. "Not constables. Better coats than constables."

"Whose?"

"That's the question everyone's decided not to ask out loud." She started walking again, back towards the yard, and spoke without turning. "Come to the kitchen on Thursday. Both of you. I'll cook badly and you can both lie to me across a table like civilised people."

"Thursday," Marcus said.

He waited until she was through the gate. Then he went down the hill, and at the bottom, where the road split, he did not take the turning towards the post house.`,
  },
  {
    key: "delivery",
    title: "The House on Vessel Street",
    summary: "Marcus delivers the letter to Aurel Kesk, whom Elena counts as an enemy.",
    pov: "Marcus",
    location: "Aurel Kesk's house, Vessel Street",
    storyTime: "Ash Week, Tuesday, before the bells",
    body: `The house on Vessel Street had its lamps lit, all of them, which in that week was nearly an insult.

A young man let him into the hall and took nothing from him — not his coat, not his name. Marcus stood on the tiles and listened to a clock he could not see, and then a door opened at the end of the corridor and Aurel Kesk said, "Well. Come where it's warm."

Kesk was smaller than the stories about him. That was what people always said afterwards, as though size were the betrayal. He had a bad shoulder from the mills and a habit of touching it while he thought, and he had signed the order that put constables in the print district in the spring, and Elena had said his name exactly twice in the fourteen months Marcus had known her, both times without any adjective at all, which was worse than any adjective.

"You walked," Kesk said. "Sit down before you drip on the rug."

"I'll stand."

"You'll stand." He seemed genuinely pleased. "Then stand and give it to me."

Marcus took the letter out of his coat. The wax had softened against his body and the seal had gone slightly out of shape, and he found he minded that more than anything else in the room.

Kesk turned it over once. He did not open it.

"She sealed it with a candle," he said.

"Yes."

"She used to seal things with a ring." He set the letter down on the desk, unopened, and put his hand over it, the way Elena had. "Does she know you came here?"

The clock went on somewhere.

"No," Marcus said.

"No." Kesk nodded slowly, as if a suspicion had been confirmed that gave him no pleasure at all. "Then we will both want to be careful about how much we enjoy this."

He crossed to the sideboard and poured two glasses, and Marcus did not touch his.

"Sit or don't," Kesk said. "But you'll wait until I've read it, and then you'll go out the yard door, and if anyone asks you tonight, you were never on this street."

"I was never on this street," Marcus said.

Outside, the first bell rang, and then the second, and the city closed like a hand.`,
  },
];

export type SampleDirection = {
  scope: "project" | "chapter" | "scene";
  sceneKey?: string;
  subject?: string;
  body: string;
  kind: "standing" | "planned" | "exception";
};

export const SAMPLE_DIRECTIONS: SampleDirection[] = [
  {
    scope: "project",
    subject: "Marcus",
    kind: "planned",
    body: "Marcus is protecting Elena's sister. Elena must not discover this yet.",
  },
  {
    scope: "project",
    kind: "standing",
    body: "Preserve Elena's guarded, clipped voice. She withholds rather than explains.",
  },
  {
    scope: "scene",
    sceneKey: "mara",
    kind: "exception",
    body: "The conversation with Mara should feel deliberately slow and uncomfortable. Avoid resolving the suspicion here.",
  },
  {
    scope: "project",
    kind: "standing",
    body: "The reader should suspect Marcus before Elena does.",
  },
];

export type SampleObservation = {
  title: string;
  body: string;
  whyItMatters: string;
  uncertainty?: string;
  sceneKey: string;
  evidence: { sceneKey: string; quote: string }[];
};

export const SAMPLE_OBSERVATIONS: SampleObservation[] = [
  {
    title: "The delivery re-reads the earlier concealment",
    sceneKey: "delivery",
    body: "Marcus withholds the letter from Mara in the second scene, then hands it to Kesk in the third. The two passages now read as one continuous decision rather than two separate moments.",
    whyItMatters:
      "The conversation with Mara could provide useful preparation for the reveal, because it is currently the only place a reader sees Marcus choose silence.",
    uncertainty: "Nothing in the prose states why he chose Kesk.",
    evidence: [
      { sceneKey: "mara", quote: "That is not the same as yes." },
      { sceneKey: "delivery", quote: "Does she know you came here?" },
    ],
  },
  {
    title: "Elena names four people she would trust, and lists none",
    sceneKey: "letter",
    body: "Elena refuses to name the people she trusts. The count is established; the identities are not.",
    whyItMatters:
      "An unnamed list is a promise to the reader. If it stays unnamed, the ambiguity should look deliberate rather than forgotten.",
    evidence: [{ sceneKey: "letter", quote: "It would be a short and frightening list." }],
  },
  {
    title: "Vessel Street is warned about before it is visited",
    sceneKey: "mara",
    body: "Elena excludes anyone who drinks on Vessel Street; Mara reports well-dressed men there the same afternoon; the letter is delivered on that street before the bells.",
    whyItMatters: "The location is doing quiet structural work across all three scenes.",
    evidence: [
      { sceneKey: "letter", quote: "anyone who drinks on Vessel Street" },
      { sceneKey: "mara", quote: "There were men on Vessel Street this afternoon" },
    ],
  },
];
