import { SuperAgentClient } from "superagentai-js";
import readline from "readline";
import ora from "ora";
import chalk from "chalk";

const superagent = new SuperAgentClient({
  token: process.env.SUPERAGENT_API_KEY,
  environment: "https://api.beta.superagent.sh"
});
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const spinner = ora({
  text: "Loading...",
  color: "magenta",
  spinner: "dots"
});
const log = {
  info: message => console.log(chalk.blue(message)),
  error: message => console.log(chalk.red(message)),
  success: message => console.log(chalk.green(message)),
  user: message => console.log(chalk.yellow(message)),
  assistant: message => console.log(chalk.cyan(`Assistant: ${message}`))
};

async function createAssistant() {
  // Configure LLM
  const { data: llm } = await superagent.llm.create({
    provider: "OPENAI",
    apiKey: process.env.OPENAI_API_KEY
  });

  // Create agent
  const { data: agent } = await superagent.agent.create({
    name: "Github Researcher",
    description: "An assistant that research Github Repositories",
    isActive: true,
    prompt: `You are an expert at researching about Github repositories.\nStart with asking the user which Github Repository URL they want to research.\n\nAlways use the Browser function to answer all questions for the repo.`,
    llmModel: "GPT_3_5_TURBO_16K_0613"
  });

  // Create browser tool
  const { data: tool } = await superagent.tool.create({
    name: "Browser",
    description: "A portal to the internet. Use this when you need to get specific content from a website.",
    type: "BROWSER",
    returnDirect: false
  });

  // Connect tool and llm to agent
  await superagent.agent.addLlm(agent.id, {
    llmId: llm.id
  })

  await superagent.agent.addTool(agent.id, {
    toolId: tool.id
  })

  return agent.id;
}

async function chatWithAssistant(agentId) {
  const recursiveAsyncReadLine = () => {
    log.user('Question: ');
    rl.question('', async (userInput) => {
      if (userInput === 'exit') {
        return rl.close();
      }

      try {
        const startTime = new Date();
        rl.pause();
        spinner.start("Thinking...");

        // Invoke agent
        const { data: { output } } = await superagent.agent.invoke(agentId, {
          input: userInput,
          enableStreaming: false,
        });

        const endTime = new Date();
        const durationInSeconds = ((endTime - startTime) / 1000).toFixed(2);
        spinner.succeed(`${durationInSeconds}s`);

        rl.resume();
        log.success(output);
      } catch (error) {
        spinner.fail('Error occurred!');
        log.error('Error invoking the agent: ' + error);
        rl.resume();
      }

      recursiveAsyncReadLine();
    });
  };
  recursiveAsyncReadLine();
}

async function main() {
  const agentId = await createAssistant();
  await chatWithAssistant(agentId);
}

main();
