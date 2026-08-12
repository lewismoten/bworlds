const meaning = document.querySelector("#meaning");
const reroll = document.querySelector("#reroll");

let grammar;
let meanings = [];
let meaningIndex = 0;

const initialsOf = value =>
  value
    .replace(/[^A-Za-z\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word[0]?.toUpperCase())
    .join("");

const getRange = ([start, end]) => `${start}-${end}`;

const shuffle = items => {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));

    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

const applyPunctuation = (parts, pattern) => {
  const punctuation = pattern.punctuation ?? {};
  const afterSegment = punctuation.afterSegment ?? {};

  const output = parts
    .map(({ range, text }, index) => {
      let value = text;

      if (afterSegment[range]) {
        value += afterSegment[range];
      }

      if (
        index === parts.length - 1 &&
        punctuation.final &&
        !/[.!?]$/.test(value)
      ) {
        value += punctuation.final;
      }

      return value;
    })
    .join(pattern.join ?? " ");

  return /[.!?]$/.test(output)
    ? output
    : `${output}.`;
};

const combinations = pools => {
  return pools.reduce(
    (results, pool) =>
      results.flatMap(result =>
        pool.map(value => [...result, value]),
      ),
    [[]],
  );
};

const buildPatternMeanings = pattern => {
  const segmentPools = pattern.segments.map(segment => {
    const range = getRange(segment);
    const pool = pattern.pools?.[range];

    if (!Array.isArray(pool) || pool.length === 0) {
      console.warn(
        `Skipping "${pattern.id}": missing pool ${range}.`,
      );

      return null;
    }

    return {
      range,
      pool,
    };
  });

  if (segmentPools.includes(null)) {
    return [];
  }

  const pools = segmentPools.map(item => item.pool);

  return combinations(pools)
    .map(values => {
      const parts = values.map((text, index) => ({
        range: segmentPools[index].range,
        text,
      }));

      return applyPunctuation(parts, pattern);
    })
    .filter(value => initialsOf(value) === grammar.acronym);
};

const buildAllMeanings = () => {
  const generated = grammar.patterns.flatMap(
    buildPatternMeanings,
  );

  meanings = shuffle([...new Set(generated)]);
  meaningIndex = 0;

  console.info(
    `Generated ${meanings.length} unique KOGNABO meanings.`,
  );
};

const showNextMeaning = () => {
  if (!meanings.length) {
    return;
  }

  if (meaningIndex >= meanings.length) {
    meanings = shuffle(meanings);
    meaningIndex = 0;

    /*
     * Avoid showing the same phrase across the shuffle boundary.
     */
    if (
      meanings.length > 1 &&
      meanings[0] === meaning.textContent
    ) {
      [meanings[0], meanings[1]] = [
        meanings[1],
        meanings[0],
      ];
    }
  }

  const output = meanings[meaningIndex];

  meaningIndex += 1;

  meaning.classList.remove("changing");

  /*
   * Force the browser to observe the removed class so the animation
   * restarts on every click.
   */
  void meaning.offsetWidth;

  meaning.textContent = output;
  meaning.classList.add("changing");
};

const loadGenerator = async () => {
  const response = await fetch("index.json", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Unable to load index.json: ${response.status}`,
    );
  }

  grammar = await response.json();

  if (grammar.acronym !== "KOGNABO") {
    throw new Error(
      "index.json does not contain a KOGNABO grammar.",
    );
  }

  buildAllMeanings();
  showNextMeaning();
};

reroll.addEventListener("click", showNextMeaning);

loadGenerator().catch(error => {
  console.error(error);

  meaning.textContent =
    "Keep On Going. Nothing Actually Broke Obviously.";

  reroll.disabled = true;
});