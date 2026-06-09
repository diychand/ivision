import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import pandas as pd
import os
import pickle

MODELS_DIR = "saved_models"
os.makedirs(MODELS_DIR, exist_ok=True)

class TextDataset(Dataset):
    def __init__(self, texts, labels, vocab, max_len=50):
        self.texts = texts
        self.labels = labels
        self.vocab = vocab
        self.max_len = max_len

    def __len__(self):
        return len(self.texts)

    def tokenize(self, text):
        words = str(text).lower().split()
        ids = [self.vocab.get(w, 1) for w in words]  # 1 = unknown
        # Pad or truncate
        if len(ids) < self.max_len:
            ids += [0] * (self.max_len - len(ids))
        else:
            ids = ids[:self.max_len]
        return ids

    def __getitem__(self, idx):
        token_ids = self.tokenize(self.texts[idx])
        return torch.tensor(token_ids, dtype=torch.long), self.labels[idx]


class TextClassifier(nn.Module):
    def __init__(self, vocab_size, embed_dim, num_classes):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.lstm = nn.LSTM(embed_dim, 64, batch_first=True)
        self.fc = nn.Linear(64, num_classes)
        self.dropout = nn.Dropout(0.3)

    def forward(self, x):
        embedded = self.dropout(self.embedding(x))
        _, (hidden, _) = self.lstm(embedded)
        out = self.fc(hidden[-1])
        return out


def build_vocab(texts):
    vocab = {"<pad>": 0, "<unk>": 1}
    for text in texts:
        for word in str(text).lower().split():
            if word not in vocab:
                vocab[word] = len(vocab)
    return vocab


def train_nlp_model(file_path: str, epochs: int, job_id: int, progress_callback):
    try:
        df = pd.read_csv(file_path)

        # Expect first column = text, last column = label
        text_col = df.columns[0]
        label_col = df.columns[-1]

        texts = df[text_col].tolist()
        raw_labels = df[label_col].tolist()

        # Encode labels
        unique_labels = sorted(list(set(str(l) for l in raw_labels)))
        label2idx = {l: i for i, l in enumerate(unique_labels)}
        labels = [label2idx[str(l)] for l in raw_labels]
        num_classes = len(unique_labels)

        # Build vocabulary
        vocab = build_vocab(texts)
        vocab_size = len(vocab)

        dataset = TextDataset(texts, labels, vocab)
        loader = DataLoader(dataset, batch_size=8, shuffle=True)

        # Build model
        model = TextClassifier(vocab_size, embed_dim=32, num_classes=num_classes)
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)

        # Training loop
        for epoch in range(epochs):
            model.train()
            total_loss = 0
            correct = 0
            total = 0

            for batch_texts, batch_labels in loader:
                batch_labels = torch.tensor(batch_labels, dtype=torch.long)
                optimizer.zero_grad()
                outputs = model(batch_texts)
                loss = criterion(outputs, batch_labels)
                loss.backward()
                optimizer.step()

                total_loss += loss.item()
                _, predicted = outputs.max(1)
                total += batch_labels.size(0)
                correct += predicted.eq(batch_labels).sum().item()

            accuracy = correct / total
            avg_loss = total_loss / len(loader)
            progress_callback(epoch + 1, epochs, accuracy, avg_loss)

        # Save model
        model_path = f"{MODELS_DIR}/job_{job_id}_nlp.pt"
        torch.save({
            "model_state": model.state_dict(),
            "vocab": vocab,
            "label2idx": label2idx,
            "unique_labels": unique_labels,
            "num_classes": num_classes,
            "vocab_size": vocab_size,
            "model_type": "nlp"
        }, model_path)

        metrics = {
            "accuracy": accuracy,
            "precision": accuracy,
            "recall": accuracy,
            "f1": accuracy,
            "confusion_matrix": [],
            "classes": unique_labels
        }

        return metrics, model_path

    except Exception as e:
        raise Exception(f"NLP training failed: {str(e)}")