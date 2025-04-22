from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="common-grants",
    version="0.1.0",
    author="CommonGrants Team",
    author_email="team@commongrants.org",
    description="Python SDK for the CommonGrants protocol",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/HHS/simpler-grants-protocol",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=[
        "pydantic>=2.0.0",
        "email-validator>=2.0.0",
    ],
) 