import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from "openai";
import { useCallback, useMemo, useState } from "react";
import { ReactMarkdown } from "react-markdown/lib/react-markdown";

interface PromptResult {
  prompt: string;
  result: string;
  feedback: string;
}

const openai = new OpenAIApi(
  new Configuration({
    apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  })
);

export default function PromptDesigner() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<PromptResult[]>([
    { prompt: "", result: "", feedback: "" },
  ]);

  const promptImprovementPrompt = useMemo(() => {
    const messages: ChatCompletionRequestMessage[] = [
      {
        role: "system",
        content:
          "You are a prompt engineer, designed to make instructions for machines as clear and effective as possible.",
      },
    ];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      messages.push({
        role: "user",
        content: `Instructions:\n'''${result.prompt}'''\n\nInput:\n'''${input}'''\n\nOutput:\n'''${result.result}'''\n\nFeedback:\n'''${result.feedback}'''\n\nWhat additional instructions should the machine follow?`,
      });
      if (i < results.length - 1) {
        messages.push({
          role: "assistant",
          content: `Revised instructions: ${results[i + 1].prompt}`,
        });
      }
    }

    // messages.push({
    //   role: "user",
    //   content: `Baseline instructions:\n'''${initialPrompt}'''\n\nInput:\n'''${input}'''\n\nOutput:\n'''${desiredOutput}'''\n\nWhat additional instructions might the machine have followed?`,
    // });

    return messages;
  }, [input, results]);

  const improvePromptAndSampleResult = useCallback(async () => {
    const improvePromptResponse = await openai.createChatCompletion({
      messages: promptImprovementPrompt,
      model: "gpt-4",
    });

    const predictedPrompt =
      improvePromptResponse.data.choices[0].message!.content!;

    setResults((results) => [
      ...results,
      { prompt: predictedPrompt, result: "", feedback: "" },
    ]);
  }, [promptImprovementPrompt]);

  const addMachineOutput = useCallback(
    async (index: number) => {
      const { prompt } = results[index];

      // Get machine output for this prompt
      const machineOutputResponse = await openai.createChatCompletion({
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: input },
        ],
        model: "gpt-4",
      });

      const machineOutput =
        machineOutputResponse.data.choices[0].message!.content!;

      setResults((results) => [
        ...results,
        { prompt: prompt, result: machineOutput, feedback: "" },
      ]);
    },
    [input, results]
  );

  return (
    <div
      style={{
        margin: "1rem auto",
        display: "flex",
        flexDirection: "column",
        width: "40rem",
      }}
    >
      <h1>Prompt Designer</h1>
      <p>Input to the model:</p>
      <textarea value={input} onChange={(e) => setInput(e.target.value)} />
      {results.map((result) => {
        return (
          <div style={{ width: "100%" }}>
            <p>Prompt</p>
            <textarea
              style={{ width: "100%" }}
              rows={8}
              value={result.prompt}
              onChange={(e) => {
                setResults((results) =>
                  results.map((r) => {
                    if (r === result) {
                      return {
                        ...r,
                        prompt: e.target.value,
                      };
                    }
                    return r;
                  })
                );
              }}
            />
            <br />
            <button onClick={() => addMachineOutput(results.indexOf(result))}>
              Generate machine output
            </button>
            <p>Result</p>
            <ReactMarkdown children={result.result} />
            <p>Feedback</p>
            <textarea
              style={{ width: "100%" }}
              rows={5}
              value={result.feedback}
              onChange={(e) => {
                setResults((results) =>
                  results.map((r) => {
                    if (r === result) {
                      return {
                        ...r,
                        feedback: e.target.value,
                      };
                    }
                    return r;
                  })
                );
              }}
            />
          </div>
        );
      })}
      <div style={{ margin: "1rem" }}>
        <button onClick={improvePromptAndSampleResult}>Redesign</button>
      </div>
    </div>
  );
}
