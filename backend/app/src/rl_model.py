import numpy as np
import tensorflow as tf
from tf_keras.models import Sequential
from tf_keras.layers import Dense, LSTM, Input
from tf_keras.optimizers import Adam

class RLTrader:
    def __init__(self, state_size, action_size):
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
        target = rewards + (1 - dones) * 0.95 * np.amax(self.model.predict(next_states), axis=1)
        target_full = self.model.predict(states)
        indices = np.array([i for i in range(len(actions))])
        target_full[[indices], [actions]] = target
        self.model.fit(states, target_full, epochs=1, verbose=0)

    def act(self, state):
        return np.argmax(self.model.predict(state)[0])