"""Reinforcement-learning trader (a small deep Q-network built with TensorFlow/Keras).

How it works, in plain words:
- The agent looks at the last 10 daily price changes plus a flag saying whether it
  currently holds the coin. This is the "state".
- It picks one of three actions: 0 = hold, 1 = buy, 2 = sell.
- After each step it gets a "reward": the profit or loss of its position on the next
  day (minus a small trading fee). Over many steps it learns which actions pay off.
"""
import os
import random

import numpy as np
import tensorflow as tf
from tf_keras.models import Sequential
from tf_keras.layers import Dense, LSTM, Input
from tf_keras.optimizers import Adam

WINDOW = 10                 # how many past price changes the agent sees
STATE_SIZE = WINDOW + 1     # the price changes plus the "am I holding?" flag
ACTION_NAMES = ["hold", "buy", "sell"]
REWARD_SCALE = 50           # makes the tiny daily returns easier for the network to learn


def build_state(history, in_position, window=WINDOW):
    """Turns recent prices into the network input. Returns None if there is too little history.

    Only the prices in `history` are used, so the agent can never see the future.
    """
    if len(history) < window + 1:
        return None
    recent = np.array(history[-(window + 1):], dtype=float)
    daily_changes = recent[1:] / recent[:-1] - 1
    # Scale up and clip so a wild day cannot dominate the input
    daily_changes = np.clip(daily_changes * 20, -1, 1)
    state = np.append(daily_changes, 1.0 if in_position else 0.0)
    return state.reshape(1, STATE_SIZE, 1).astype("float32")


class RLTrader:
    def __init__(self, state_size=STATE_SIZE, action_size=3):
        self.state_size = state_size
        self.action_size = action_size
        self.model = self._build_model()

    def _build_model(self):
        model = Sequential()
        model.add(Input(shape=(self.state_size, 1)))
        model.add(LSTM(50, return_sequences=True))
        model.add(LSTM(50))
        model.add(Dense(self.action_size, activation='linear'))
        model.compile(loss='mse', optimizer=Adam(learning_rate=0.001))
        return model

    def train(self, states, actions, rewards, next_states, dones):
        """One learning step on a batch of remembered experiences."""
        discount = 0.95  # how much future rewards matter compared to the immediate one
        next_q = self.model(next_states, training=False).numpy()
        target = rewards + (1 - dones) * discount * np.amax(next_q, axis=1)
        # Start from the current predictions and only change the Q-value of the action taken
        target_full = self.model(states, training=False).numpy()
        rows = np.arange(len(actions))
        target_full[rows, actions] = target
        self.model.fit(states, target_full, epochs=1, verbose=0)

    def act(self, state, epsilon=0.0):
        """Pick an action. With probability epsilon explore randomly, otherwise pick the best."""
        if random.random() < epsilon:
            return random.randrange(self.action_size)
        q_values = self.model(state, training=False).numpy()[0]
        return int(np.argmax(q_values))

    def save(self, path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self.model.save_weights(path)

    def load(self, path):
        self.model.load_weights(path)


def train_on_prices(train_prices, epochs=8, seed=42, fee_pct=0.001, batch_size=32):
    """Trains a new agent on a list of daily prices (the TRAINING period only)."""
    random.seed(seed)
    np.random.seed(seed)
    tf.random.set_seed(seed)

    agent = RLTrader()
    memory = []        # remembered (state, action, reward, next_state, done)
    epsilon = 1.0      # start fully random, explore less each epoch
    step_count = 0

    for epoch in range(epochs):
        position = 0   # 0 = not holding, 1 = holding
        for t in range(WINDOW, len(train_prices) - 1):
            state = build_state(train_prices[:t + 1], position)
            action = agent.act(state, epsilon)

            new_position = position
            if action == 1:
                new_position = 1
            elif action == 2:
                new_position = 0

            # Reward: what the position earned between today and tomorrow, minus fees
            next_change = train_prices[t + 1] / train_prices[t] - 1
            reward = new_position * next_change
            if new_position != position:
                reward -= fee_pct
            reward *= REWARD_SCALE

            next_state = build_state(train_prices[:t + 2], new_position)
            done = 1.0 if t == len(train_prices) - 2 else 0.0
            memory.append((state, action, reward, next_state, done))
            position = new_position

            step_count += 1
            if step_count % 4 == 0 and len(memory) >= batch_size:
                batch = random.sample(memory, batch_size)
                agent.train(
                    np.concatenate([item[0] for item in batch]),
                    np.array([item[1] for item in batch]),
                    np.array([item[2] for item in batch], dtype="float32"),
                    np.concatenate([item[3] for item in batch]),
                    np.array([item[4] for item in batch], dtype="float32"),
                )
        epsilon = max(0.05, epsilon * 0.6)
        print(f"  RL training: epoch {epoch + 1}/{epochs} done (epsilon={epsilon:.2f})")

    return agent
