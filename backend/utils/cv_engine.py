import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, models
from PIL import Image
import os
import zipfile
import shutil
import numpy as np

TEMP_DIR = "temp_images"
MODELS_DIR = "saved_models"
os.makedirs(TEMP_DIR, exist_ok=True)
os.makedirs(MODELS_DIR, exist_ok=True)

def extract_zip(zip_path: str, job_id: int):
    extract_path = f"{TEMP_DIR}/job_{job_id}"
    if os.path.exists(extract_path):
        shutil.rmtree(extract_path)
    os.makedirs(extract_path)
    with zipfile.ZipFile(zip_path, "r") as z:
        z.extractall(extract_path)
    return extract_path

class ImageFolderDataset(Dataset):
    def __init__(self, root_dir, transform=None):
        self.root_dir = root_dir
        self.transform = transform
        self.images = []
        self.labels = []
        self.classes = []

        # Find all class folders
        for item in os.listdir(root_dir):
            item_path = os.path.join(root_dir, item)
            if os.path.isdir(item_path):
                self.classes.append(item)

        self.classes.sort()

        # Load images
        for label_idx, cls in enumerate(self.classes):
            cls_path = os.path.join(root_dir, cls)
            for img_file in os.listdir(cls_path):
                if img_file.lower().endswith((".jpg", ".jpeg", ".png", ".bmp")):
                    self.images.append(os.path.join(cls_path, img_file))
                    self.labels.append(label_idx)

    def __len__(self):
        return len(self.images)

    def __getitem__(self, idx):
        image = Image.open(self.images[idx]).convert("RGB")
        if self.transform:
            image = self.transform(image)
        return image, self.labels[idx]


def train_image_model(zip_path: str, epochs: int, job_id: int, progress_callback):
    try:
        # Extract zip
        extract_path = extract_zip(zip_path, job_id)

        # Check for nested folder
        items = os.listdir(extract_path)
        if len(items) == 1 and os.path.isdir(os.path.join(extract_path, items[0])):
            extract_path = os.path.join(extract_path, items[0])

        # Data transforms
        transform = transforms.Compose([
            transforms.Resize((64, 64)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406],
                                 [0.229, 0.224, 0.225])
        ])

        dataset = ImageFolderDataset(extract_path, transform=transform)

        if len(dataset) == 0:
            raise Exception("No images found in zip file")

        if len(dataset.classes) < 2:
            raise Exception("Need at least 2 class folders in zip")

        num_classes = len(dataset.classes)
        loader = DataLoader(dataset, batch_size=8, shuffle=True)

        # Build simple CNN
        model = nn.Sequential(
            nn.Conv2d(3, 32, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(32, 64, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Conv2d(64, 128, 3, padding=1), nn.ReLU(), nn.MaxPool2d(2),
            nn.Flatten(),
            nn.Linear(128 * 8 * 8, 256), nn.ReLU(), nn.Dropout(0.5),
            nn.Linear(256, num_classes)
        )

        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=0.001)

        # Training loop
        for epoch in range(epochs):
            model.train()
            total_loss = 0
            correct = 0
            total = 0

            for images, labels in loader:
                labels = torch.tensor(labels) if not isinstance(labels, torch.Tensor) else labels
                optimizer.zero_grad()
                outputs = model(images)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()

                total_loss += loss.item()
                _, predicted = outputs.max(1)
                total += labels.size(0)
                correct += predicted.eq(labels).sum().item()

            accuracy = correct / total
            avg_loss = total_loss / len(loader)
            progress_callback(epoch + 1, epochs, accuracy, avg_loss)

        # Save PyTorch model
        model_path = f"{MODELS_DIR}/job_{job_id}.pt"
        torch.save({
            "model_state": model.state_dict(),
            "classes": dataset.classes,
            "num_classes": num_classes,
            "input_size": 64
        }, model_path)

        metrics = {
            "accuracy": accuracy,
            "precision": accuracy,
            "recall": accuracy,
            "f1": accuracy,
            "confusion_matrix": [],
            "classes": dataset.classes
        }

        return metrics, model_path

    except Exception as e:
        raise Exception(f"Image training failed: {str(e)}")