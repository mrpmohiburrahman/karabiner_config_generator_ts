import { To, KeyCode, Manipulator, KarabinerRules } from "./types";
import { qwertyToColemak } from "./qwertyToColemak";
/**
 * Custom way to describe a command in a layer
 */
export interface LayerCommand {
  to: To[];
  description?: string;
}

type HyperKeySublayer = {
  // The ? is necessary, otherwise we'd have to define something for _every_ key code
  [key_code in KeyCode]?: LayerCommand;
};

/**
 * Create a Hyper Key sublayer, where every command is prefixed with a key
 * e.g. Hyper + O ("Open") is the "open applications" layer, I can press
 * e.g. Hyper + O + G ("Google Chrome") to open Chrome
 */
export function createHyperSubLayer(
  sublayer_key: KeyCode,
  commands: HyperKeySublayer,
  allSubLayerVariables: string[]
): Manipulator[] {
  const subLayerVariableName = generateSubLayerVariableName(sublayer_key);

  return [
    // When Hyper + sublayer_key is pressed, set the variable to 1; on key_up, set it to 0 again
    {
      description: `Toggle Hyper sublayer ${sublayer_key}`,
      type: "basic",
      from: {
        key_code: qwertyToColemak[sublayer_key],
        modifiers: {
          mandatory: [
            "left_command",
            "left_control",
            "left_shift",
            "left_option",
          ],
        },
      },
      to_after_key_up: [
        {
          set_variable: {
            name: subLayerVariableName,
            // The default value of a variable is 0: https://karabiner-elements.pqrs.org/docs/json/complex-modifications-manipulator-definition/conditions/variable/
            // That means by using 0 and 1 we can filter for "0" in the conditions below and it'll work on startup
            value: 0,
          },
        },
      ],
      to: [
        {
          set_variable: {
            name: subLayerVariableName,
            value: 1,
          },
        },
      ],
      // This enables us to press other sublayer keys in the current sublayer
      // (e.g. Hyper + O > M even though Hyper + M is also a sublayer)
      // basically, only trigger a sublayer if no other sublayer is active
      conditions: allSubLayerVariables
        .filter((subLayerVariable) => subLayerVariable !== subLayerVariableName)
        .map((subLayerVariable) => ({
          type: "variable_if",
          name: subLayerVariable,
          value: 0,
        })),
    },
    // Define the individual commands that are meant to trigger in the sublayer
    ...(Object.keys(commands) as (keyof typeof commands)[]).map(
      (command_key): Manipulator => ({
        ...commands[command_key],
        type: "basic" as const,
        from: {
          key_code: qwertyToColemak[command_key],
          modifiers: {
            // Mandatory modifiers are *not* added to the "to" event
            mandatory: ["any"],
          },
        },
        // Only trigger this command if the variable is 1 (i.e., if Hyper + sublayer is held)
        conditions: [
          {
            type: "variable_if",
            name: subLayerVariableName,
            value: 1,
          },
        ],
      })
    ),
  ];
}

/**
 * Create all hyper sublayers. This needs to be a single function, as well need to
 * have all the hyper variable names in order to filter them and make sure only one
 * activates at a time
 */
export function createHyperSubLayers(subLayers: {
  [key_code in KeyCode]?: HyperKeySublayer | LayerCommand;
}): KarabinerRules[] {
  const allSubLayerVariables = (
    Object.keys(subLayers) as (keyof typeof subLayers)[]
  ).map((sublayer_key) => generateSubLayerVariableName(sublayer_key));
  // console.log(
  //   `[Object.entries(subLayers)] === ${JSON.stringify(
  //     Object.entries(subLayers)
  //   )}`
  // );
  console.log(`[subLayers] === ${JSON.stringify(subLayers)}`);
  return Object.entries(subLayers).map(([key, value], index) => {
    // const allKeysForThisLayer = Object.keys(value);
    // let isAllowed = false;

    // for (const item of allKeysForThisLayer) {
    //   if (`to` in value[item]) {
    //     console.log(`to` in value[item]);
    //     if (!isAllowed) isAllowed = true;
    //   }
    // }

    if ("to" in value) {
      console.log(`to in value`);
      return {
        description: `Hyper Key + ${qwertyToColemak[key]}`,
        manipulators: [
          {
            ...value,
            type: "basic" as const,
            from: {
              key_code: qwertyToColemak[key] as KeyCode,
              modifiers: {
                // Mandatory modifiers are *not* added to the "to" event
                mandatory: [
                  "left_command",
                  "left_control",
                  "left_shift",
                  "left_option",
                ],
              },
            },
          },
        ],
      };
    } else
      return {
        description: `Hyper Key sublayer "${key}"`,
        manipulators: createHyperSubLayer(
          key as KeyCode,
          value,
          allSubLayerVariables
        ),
      };
  });
}

function generateSubLayerVariableName(key: KeyCode) {
  return `hyper_sublayer_${key}`;
}

/**
 * Shortcut for "open" shell command
 */
export function open(what: string): LayerCommand {
  return {
    to: [
      {
        shell_command: `open ${what}`,
      },
    ],
    description: `Open ${what}`,
  };
}

/**
 * Shortcut for "Open an app" command (of which there are a bunch)
 */
export function app(name: string): LayerCommand {
  return open(`-a '${name}.app'`);
}
