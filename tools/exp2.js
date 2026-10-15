  experience: [
    {
      key: 'virtua', kind: 'work',
      org: 'Virtua Health', role: 'Data Scientist', dates: 'Jan 2026 – present', place: 'Marlton, NJ',
      logo: 'https://www.virtua.org/-/media/Project/Virtua-Tenant/Virtua/Shared/Common/Virtua_Health_Horiz.svg?iar=0&hash=55C7DEDED0E89E3E40E98427C2C78F42', plate: 'light', mono: 'V', accent: '#2a7de1',
      about: 'Virtua Health is a nonprofit health system in southern New Jersey. Its clinical data lives in Epic.',
      summary: 'I build clinical prediction models, language pipelines over clinical notes and documentation, and retrieval-based assistants for staff, working from Epic Clarity data through to results presented to physicians and leadership.',
      domains: ['Clinical prediction', 'Medical imaging', 'Clinical NLP', 'Generative AI and retrieval', 'Data engineering', 'Model evaluation and interpretability'],
      stack: [
        ['Languages & data', 'Python, SQL, Spark, SQL Server, Epic Clarity'],
        ['Modelling', 'PyTorch, scikit-learn, LightGBM, XGBoost, CatBoost, random forests, SHAP, VideoMAE, EchoNet'],
        ['Generative AI', 'GPT-4o, Azure OpenAI, Azure AI Foundry, Azure AI Search, LangChain'],
        ['Platform & tooling', 'Microsoft Fabric, OneLake, Azure Blob Storage, Docker, Kubernetes, FastAPI, MLflow, Git, GitHub Actions'],
      ],
      depth: [
        { h: 'Clinical prediction', ul: [
          'Built multimodal risk models for cardiac ablation using EHR data, clinical notes and 473,000 imaging studies across more than 100,000 patient encounters, reaching 0.81 ROC-AUC and 0.60 PR-AUC.',
          'Compared machine-learning and deep-learning approaches, and developed an ensemble of LightGBM, XGBoost and CatBoost over 4,192 engineered variables.',
          'Used temporal validation, so models are tested on later patients than they were trained on, and SHAP to show which variables drive each prediction.' ] },
        { h: 'Medical imaging', ul: [
          'Applied video models (VideoMAE, EchoNet) to multi-frame DICOM studies and combined the imaging-derived features with structured clinical data.' ] },
        { h: 'Language and generative AI', ul: [
          'Built a GPT-based pipeline that processes more than 50,000 clinical notes, using structured prompts, semantic chunking and parallel processing to turn free text into model features.',
          'Rebuilt the ICD documentation pipeline with Spark and Azure OpenAI across more than 50,000 records: processing time fell from four days to 20 hours, and misclassified cases from over 700 to 57.',
          'Developed GPT-4o assistants for HR and the Access Center over more than 12,000 documents, using retrieval so answers cite their source documents.' ] },
        { h: 'Data engineering', ul: [
          'Built Spark and SQL pipelines on Epic Clarity that consolidate longitudinal patient records for modelling and reporting.',
          'Presented model results and system updates to physicians and leadership.' ] },
      ],
    },
    {
      key: 'njms', kind: 'work',
      org: 'Rutgers New Jersey Medical School', role: 'Machine Learning Research Engineer', dates: 'Oct 2024 – Dec 2025', place: 'Newark, NJ',
      logo: 'assets/logos/rutgers.png', accent: '#cc0033',
      about: 'Rutgers New Jersey Medical School is Rutgers University’s medical school in Newark. I worked in Prof. Joel Freundlich’s drug-discovery research group.',
      summary: 'I built models that predict molecular properties for drug discovery, the validation framework used to compare them, and language-model tools for searching the scientific literature.',
      domains: ['Molecular property prediction', 'Graph neural networks', 'Hyperparameter optimisation', 'Statistical validation', 'Scientific NLP', 'Semantic search'],
      stack: [
        ['Languages', 'Python, SQL'],
        ['Modelling', 'PyTorch, scikit-learn, D-MPNN, XGBoost, SVM, BERT, SciBERT'],
        ['Optimisation', 'Ray Tune, Optuna, HyperOpt'],
        ['Language models & search', 'GPT and Claude APIs, FAISS'],
        ['Infrastructure', 'PostgreSQL, Docker, AWS'],
      ],
      depth: [
        { h: 'Molecular property prediction', ul: [
          'Built a modular directed message-passing neural network (D-MPNN) pipeline, which learns from a molecule’s graph of atoms and bonds, with tuned hyperparameters, regularisation and domain features.',
          'Improved ROC-AUC by 14% and reached 0.82 PR-AUC against XGBoost and SVM baselines on supervised learning tasks.',
          'Reduced validation time for more than 4,000 molecules from hours to minutes; the results informed the lab’s drug-discovery work.' ] },
        { h: 'Validation', ul: [
          'Designed stratified k-fold cross-validation and compared Ray Tune, Optuna and HyperOpt across more than 200 hyperparameter configurations.' ] },
        { h: 'Literature and language models', ul: [
          'Integrated GPT and Claude APIs for knowledge extraction across more than 10,000 papers, with FAISS semantic search returning results in under a second; this sped up candidate identification by 40%.',
          'Built BERT and SciBERT fine-tuning pipelines for scientific document classification, reaching 91% accuracy on domain benchmarks.' ] },
      ],
    },
    {
      key: 'targum', kind: 'work',
      org: 'The Daily Targum', role: 'Lead Developer', dates: 'Aug 2023 – May 2024', place: 'New Brunswick, NJ',
      logo: 'assets/logos/targum.png', accent: '#e9c46a',
      about: 'The Daily Targum is Rutgers University’s student newspaper, founded in 1869.',
      summary: 'I led development of the paper’s website and built the models and dashboards the editorial board used for content decisions.',
      domains: ['Web development', 'Cloud infrastructure', 'Forecasting', 'Recommender systems', 'Text classification', 'Analytics and reporting'],
      stack: [
        ['Data & ML', 'Python, PyTorch, Hugging Face, FAISS, ChromaDB'],
        ['Cloud & data', 'AWS (including Lambda and DynamoDB), PostgreSQL'],
        ['Reporting', 'Plotly, Gradio'],
      ],
      depth: [
        { h: 'Website', ul: [
          'Rebuilt the paper’s site on AWS with DynamoDB, cutting maintenance by about 50% and monthly cost by about 25%.' ] },
        { h: 'Models', ul: [
          'Trained an LSTM with attention on two years of reader-behaviour data to forecast article performance. Editors used the score for homepage and topic prioritisation; engagement rose 20% and ad revenue 15%.',
          'Built a semantic search and recommendation engine over more than 50,000 articles using sentence embeddings, FAISS and ChromaDB; discoverability rose 35% and session duration 40%.',
          'Fine-tuned RoBERTa for multi-label content tagging, reducing manual editorial work by 50%, with ongoing monitoring for drift and drops in precision.' ] },
        { h: 'Reporting', ul: [
          'Presented analytics through Plotly and Gradio dashboards to the 12-person editorial board, informing a six-month content strategy and budget decisions with the paper’s CMS provider.' ] },
      ],
    },
    {
      key: 'rutgers-ra', kind: 'work',
      org: 'Rutgers University', role: 'AI/ML Graduate Research Assistant', dates: 'Jan 2023 – Jul 2023', place: 'New Brunswick, NJ',
      logo: 'assets/logos/rutgers.png', accent: '#cc0033',
      about: 'Rutgers, The State University of New Jersey, is a public research university. I worked with faculty in the Department of Statistics.',
      summary: 'I standardised the research group’s model-training workflows and applied causal-inference methods in faculty research.',
      domains: ['Machine learning', 'Reproducible pipelines', 'Causal inference', 'Model evaluation'],
      stack: [
        ['Languages', 'Python, R, Stata'],
        ['Modelling', 'scikit-learn, XGBoost, PyTorch, TensorFlow, SVM, random forests'],
        ['Other', 'LangChain, AWS'],
      ],
      depth: [
        { h: 'Reproducible pipelines', ul: [
          'Standardised training workflows for SVM, random forest and XGBoost with stratified cross-validation and parallel processing. The pipeline reached 95% accuracy on adversarial datasets, cut runtime by 35% and became the department standard.',
          'Ported and tuned a random forest model from R to Stata, improving its accuracy by 15% to 0.93.' ] },
        { h: 'Causal inference', ul: [
          'Applied propensity score matching and sensitivity analysis to account for confounding variables, reducing RMSE by 15% compared with regression.',
          'Assisted the professor’s research on Two-Stage Curvature Identification.' ] },
      ],
    },
    {
      key: 'siemens', kind: 'work',
      org: 'Siemens', role: 'Global Business Services Intern, Machine Learning Team', dates: 'Jun 2021 – Aug 2021', place: 'India',
      logo: 'assets/logos/siemens.png', accent: '#3cc3c9',
      about: 'Siemens is a global technology company. I interned with Siemens Technology and Services in India.',
      summary: 'I built a file-registration automation tool on my own and worked in an international team clustering customer comments written in 14 languages.',
      domains: ['Natural language processing', 'Topic modelling', 'Clustering', 'Process automation'],
      stack: [
        ['Languages', 'Python, Bash'],
        ['NLP', 'LDA, BERT, Sentence-BERT, TF-IDF, HDBSCAN'],
        ['Systems', 'Windows Registry'],
      ],
      depth: [
        { h: 'Automation', ul: [
          'Built a tool that registers large numbers of files (mainly DLLs) with the Windows Registry and backs up the registry first.',
          'Presented the project to stakeholders in the Siemens Global Group in two meetings.' ] },
        { h: 'Customer comment clustering', ul: [
          'Researched topic modelling, then implemented and improved Latent Dirichlet Allocation (LDA) on customer comment data.',
          'Worked with colleagues in Germany, Taiwan, India and South Korea to cluster comments in 14 languages using BERT sentence embeddings, HDBSCAN and TF-IDF.',
          'Tuned hyperparameters to reach 87% accuracy.' ] },
      ],
    },
    {
      key: 'kaiser', kind: 'work',
      org: 'Kaiser Exports', role: 'Freelance Web Developer', dates: 'Sep 2020 – Dec 2020', place: 'Mumbai, India',
      logo: 'assets/logos/kaiser.png', accent: '#2f9e6e',
      about: 'Kaiser Exports exports pharmaceuticals, nutraceuticals and promotional material to markets in Africa and South America.',
      summary: 'I built two websites for the business: Kaiser Pharmaceuticals and Aura Packaging.',
      domains: ['Web development', 'Product catalogues'],
      stack: [['Front end', 'HTML, CSS, JavaScript, Bootstrap, jQuery']],
      depth: [
        { ul: [
          'Kaiser Pharmaceuticals: a product catalogue with pages for each therapeutic category, including antibiotics, cardiovasculars, antidiabetics, respiratories and nutraceuticals.',
          'Aura Packaging: a site for the packaging business, covering primary, secondary and tertiary packaging.',
          'Worked directly with the company’s management on content and requirements.' ] },
      ],
    },
    {
      key: 'rutgers-ms', kind: 'edu',
      org: 'Rutgers University', role: 'M.S. in Statistics (Data Science)', dates: '2022 – 2024', place: 'New Brunswick, NJ',
      logo: 'assets/logos/rutgers.png', accent: '#cc0033',
      labels: ['About the institution', 'What I studied', 'Areas', 'Tools used'],
      about: 'Rutgers, The State University of New Jersey, is a public research university.',
      summary: 'A master’s in statistics with a data-science focus: statistical analysis and inference, statistical modelling, machine learning and deep learning.',
      domains: ['Statistical inference', 'Statistical modelling', 'Machine learning', 'Deep learning', 'Time series', 'Data mining', 'Databases'],
      stack: [['Tools', 'R, Python, SQL, PyTorch, TensorFlow, PostgreSQL, MongoDB, Tableau, Power BI, BigQuery']],
      depth: [
        { p: 'Several projects on this site came from the programme:' },
        { ul: [
          'S&P 500 sector analysis and ARIMA forecasting, in R.',
          'Credit card attrition with logistic, ridge and lasso regression.',
          'Netflix and college clustering.',
          'The role of optimizers in neural networks.',
          'Privacy-preserving face recognition.',
          'A Twitter search engine on PostgreSQL and MongoDB.' ] },
      ],
    },
    {
      key: 'srm', kind: 'edu',
      org: 'SRM Institute of Science and Technology', role: 'B.Tech in Computer Science and Engineering', dates: '2018 – 2022', place: 'Chennai, India',
      logo: null, mono: 'SRM', accent: '#1f4e9c',
      labels: ['About the institution', 'What I studied', 'Areas', 'Tools used'],
      about: 'SRM Institute of Science and Technology is a private university in Chennai, India.',
      summary: 'Computer science with electives in artificial intelligence, advanced calculus and probability, fuzzy logic and genetic programming.',
      domains: ['Algorithms and data structures', 'Artificial intelligence', 'Machine learning', 'NLP'],
      stack: [['Tools', 'Python, R, Java, C, C++, HTML, CSS, JavaScript']],
      depth: [
        { ul: [
          'Thesis: clustering scientific research papers with transformer embeddings and topic modelling. It won Best Paper at IRCICD 2022.',
          'Programming courses each required 100 solved programs and a presentation on one of them.',
          'Completed the University of Washington Machine Learning Specialization and the Google Data Analytics Professional Certificate during the degree.',
          'Interned at Siemens and freelanced for Kaiser Exports during the degree.' ] },
      ],
    },
  ],
