# Installation

These instructions are provided in case you want to run your own instance of Plotter. The software is encapsulated in [Docker](http://docker.com) containers, making the software relatively easy to deploy on different host systems.

## Technical overview
There are four Docker containers that are set up in order to run Plotter. 

First is the *web container* that first compiles the latest version of the front end application and serves it with [Nginx](http://nginx.com) web server.

During run time, the web container communicates with the *API container* to retrieve sample data, browsing states and other necessary information to operate. The API container is compiled by supplying a TSV file to populate the back end database with necessary samples. During run time, the API container runs the back end Python script in parallel with Gunicorn. 

The third container is the *database container* that runs a MongoDB instance. It links with a another container named `mongodata` that is a volume container to persist any changes made to the running database.

## 1. Install the prerequisites

These instructions presume your host system has Docker, Docker-compose and Git client installed. 

* Install Docker by following [these instructions](https://docs.docker.com/engine/installation/).

* Install The Docker-compose package by following the [manufacturer's instructions](https://docs.docker.com/compose/install/).

* Install the Git client. [More information here](https://git-scm.com/downloads).

## 2. Retrieve the codebase

Clone the Github repository:

`$ git clone https://github.com/amergin/plotter.git`

Change the directory:

`$ cd plotter`

## 3. Check the Docker project settings

Check the contents of the file named `docker-compose.yml`. This file contains instructions on how to compile the four needed Docker containers. 

### Web server port

By default, the application is served to port `30303`. This can be modified as needed by changing the configuration line:

```
 ports:
  - "30303:80"
``` 
The port `80` is the internal port used by the container.

### Initializing the database
Look for the line containing

```
command: "/run.sh load"
```

The run script initializes the database (populates the database from a TSV file provided) with the command `load`. This is the correct behaviour when you are installing Plotter. In case you later on want to re-compile the Docker instance and preserve any modifications made to the database in the mean time, be sure to change `load` to `start`. Otherwise, the database will be re-initialized and any modifications done to the database will be lost.

## 4. Configure the data source and import settings

## Source file

During the compilation phase, Plotter looks for a file named `python-api/api-docker/samples.tsv`. In this file, the first row indicates the variable names (columns). Each sample (row in the data source file) needs to be uniquely identifiable by the combination of dataset name and the sample ID (see later sections of this documentation). 

## Import settings

Plotter is instructed to imported the data based on the settings stored in the configuration file `python-api/setup.json`. Open this file with a text editor. The import settings are stored in the file under the key `dataLoader`.

### Separator, ID column

Look for the key `dataSource` in the file. The `columnSeparator` field tells the import script what is the separating character in the data source file (`samples.tsv`). Usually this is `\t` (tab-separated values, TSV) or `,` (comma-separated values). The `sampleIdColumn` field tells the script which column to look for to uniquely identify each sample (row) of the data source file. 

For example, the following except from a settings file tells the script that the data source is a tab-separated values file which holds a column named ID to identify the rows:

```
"dataSource": {
  "columnSeparator": "\t",
  "sampleIdColumn": "ID"
},
```

### Dataset column

Look for the field `dataset` in the settings file. This section contains two settings. The first is `identifierColumn` which tells the import script which column in the data source file identifies the dataset name. If the data source file does not contain a column for identifying the dataset name, the script looks for the setting `defaultName`. This setting is then used to set a default name for each of the loaded rows.

The following example from a settings file tells the import script the column *datasetname* should be present the data source file, and if not, label all the samples as belonging to dataset named *default*.

```
"dataset": {
  "identifierColumn": "datasetname",
  "defaultName": "default"
},
```

### Metadata file

#### Settings

Look for the field `metadata` in the settings file. This has three fields. The `file` field tells the file name of the meta data file. The `columnSeparator` field tells which character is used in the meta data file as the separator, usually this would be either a tab (`\t`), or comma (`,`). The `topGroupSeparator` is can be used to split variable groups in to sub groups as needed; this field tells the script which character to look for within the `group` colum.

For example the following excerpt tells that the file *metabolites_description_160921_baker.MS.tsv* is the meta data file to use, and it is separated by tabs and groups are split in to subgroups if character *:* is present in the `group` column.

```
"metadata": {
  "file": "metabolites_description_160921_baker.MS.tsv",
  "columnSeparator": "\t",
  "topGroupSeparator": ":"
},
```

#### The File

The meta data file holds four columns: 

* `name` (Name of the variable)
* `desc` (Description, free text field)
* `unit` (Unit of the variable, free text field, e.g. mmmol/l)
* `group` (The variable group under which the variable will grouped in the software variable lookups, and in figures)

The `name` column value cannot include any dots (`.`) or commas (`,`).

As an example, the row:

```
L-VLDL-P  Concentration of large VLDL particles mol/l Lipoprotein subclasses: Large VLDL
```
Describes a variable named *L-VLDL-P* that has description *Concentration of large VLDL particles*, has a unit of *mmol/l*, and belongs to a group *Lipoprotein subclasses:  Large VLDL*. If the `topGroupSeparator` is set to `:` as in the previous section example, this group would now be presented in the user interface as *Lipoprotein subclasses* and this variable would be under a sub group named *Large VLDL*.

Note that the order rows in this file is significant. Each variable group and a variable within this group is assigned an ordering number. The first occurence of a variable group in the file determines its order number. The ordering numbers are used in displaying the variable lists in the user interface as well as in arranging the computation results in various figures.

#### Categorical variables

If a variable has discrete value range (i.e. categorical variable), supply the unit in the following format: `|C|value1=description|value2=description|...`.  The values must be convertable to numbers.

For instance, the row

```
Gender  Patient gender  |C|0=female|1=male|NaN=(Not available) Clinical data
```

describes a variable named *Gender* with a description of *Patient gender*. The variable is a class variable and will have values 0 (will be presented as *female*) and 1 (will be presented as *male*). If the value is not coercible to number, it will be presented as *(Not available)*.

#### Regular expressions

Sometimes manually constructing a proper meta data file is too time-consuming. For instance, there may be a requirement to import a data source file that contains a number of variables that follow a certain pattern. In this case, the meta data can be specified by supplying a valid [regular expression](https://en.wikipedia.org/wiki/Regular_expression) pattern.

For example, the line

```
|regex|PC_\d{1,3}:\d  |self|  nmol/l  Mass spectrometry: Phosphatidylcholines
```
specifies that variables that match the pattern `PC_\d{1,3}:\d` have a description that is the same as the variable name (`|self`). This pattern would place variables *PC_28:0* as well as *PC_39:6* to the group *Mass spectrometry: Phosphatidylcholines*.

### Dataset variables

To create a variable for each of the datasets that are imported, set `createDatasetVariables` to `true` in the settings file. 

Example: the settings file contains the following except

```
"createDatasetVariables": true,
```
and the data source file imports samples belonging to datasets named `set1`, `set2`, and `set3`. The import script would then create variables named `dataset_set1`, `dataset_set2`, and `dataset_set3` under the group *Dataset variables*. For samples that belong to a dataset named `set1`, the `dataset_set1` variable would then have value `1`. The variables `dataset_set2` and `dataset_set2` would correspondingly have value `0` for these samples.

### Excluding variables from source data

By default, all of the variables defined in the source data file are loaded during import. Sometimes it can be handy to exclude some of the variables. This can be achieved by adding the optional `exclude` setting to the configuration file. Example:

```
"exclude": ["Waist", "Hip", "W_H_ratio", "HR", "VO2max", "Energy", "Fat"]

```
Note that regular expressions are not supported in this option.

### Renaming variables during import

Variables can be renamed during import. Example:

```
"rename": [
  {
    "from": "Gender",
    "to": "Sex"
  }
]
```

### Escaping variable names

To ensure the imported variables do not have names that contain illegal characters, such characters must be escaped in the importing phase. Illegal characters include (but are not limited to) `/` (forward slash), `%` (per cent), `.` (dot).

The following example tells the import script to replace `/` with string `to`, `%` with `prc`, and `.` with string `-`:

```
"variables": {
  "escape": [
    {
      "regex": "\/",
      "replaceWith": "to"
    },
    {
      "regex": "%",
      "replaceWith": "prc"
    },
    {
      "regex": "\\.",
      "replaceWith": "-"
    }
  ]
},
```
The character matching is done by supplying a valid [regular expression](https://en.wikipedia.org/wiki/Regular_expression) and a string that replaces the found content. The number of escape rules is not limited.

### Default view settings

The field `views` in the settings file describes the default behaviour for the [Explore and filter view](userguide.md#explore-and-filter) and the [SOM view](userguide.md#self-organizing-maps).

Let's look at an example configuration:

```
"views": {
  "explore": {
    "defaultHistograms": ["Serum-C", "Serum-TG", "HDL-C", "LDL-C", "Glc"]
  },
  "som": {
    "defaultProfiles": [
      {
        "name": "Fatty acids",
        "variables": ["TotFA","UnSat","DHA","LA","FAw3","FAw6","PUFA","MUFA","SFA","DHAtoFA","LAtoFA","FAw3toFA","FAw6toFA","PUFAtoFA","MUFAtoFA" ,"SFAtoFA"]
      },
      {
        "name": "Total lipids",
        "regex": ".*-L\\b"
      },
      {
          "name": "Small molecules",
          "variables": ["Glc", "Lac", "Pyr", "Cit", "Ala", "Gln", "His", "Ile", "Leu", "Val", "Phe", "Tyr", "Ace", "AcAce", "bOHBut", "Crea", "Alb", "Gp"]
      },
      {
          "name": "Clinical variables",
          "variables": ["Age", "Gender", "BMI", "Weight", "Height", "SBP", "DBP", "HR", "VO2max", "Energy", "Fat", "Sat", "Poly", "Mono", "Protein", "CHO", "Alcohol", "M_i"]
      }
    ],
    "defaultInputVariables": ["XXL-VLDL-L","XL-VLDL-L","L-VLDL-L","M-VLDL-L","S-VLDL-L","XS-VLDL-L","IDL-L","L-LDL-L","M-LDL-L","S-LDL-L","XL-HDL-L","L-HDL-L","M-HDL-L","S-HDL-L","Serum-C","Serum-TG","HDL-C","LDL-C","Glc","Cit","Phe","Gp","Tyr","FAw3toFA","FAw6toFA","SFAtoFA"],
    "defaultPlanes":  ["Serum-C", "Serum-TG", "HDL-C", "LDL-C", "Glc"],
    "pivot": {
      "enabled": true,
      "defaultVariable": "Gender"
    }
  }
}
```

In the `explore` section of the view settings, the field `defaultHistograms` instructs the software to display the named five variables if the user loads the Explore and filter view, and the followed URL does not contain a state that is to be loaded. These variables must be loaded during the import phase. 

In the `som` section of the view settings, there are four fields:

* `defaultProfiles` field takes an array containing objects that define which [profile histograms](userguide.md#profile-histogram) to display in the software. Each object should contain a `name` for the figure, and an array of variable names that are used in the figure (the field `variables`). Alternatively, you can use a regular expression to match the used variables by replacing the `variables` field with `regex` field holding a valid pattern.

* `defaultInputVariables` field takes an array containing strings of variable names. The variables are used as default training variables for the Self-Organizing Maps. A user can set their preferred training variables from the user interface in the software.

* `defaultPlanes` field takes an array containing strings of variable names. These variables describe which SOM planes are displayed by default the the user.

* The `pivot` section controls whether to use pivoting in the SOM training. If the `enabled` parameter is set to `true`, the variable named in `defaultPivotVariable` is used in all SOM computations. Note that this can be overridden on a session-by-session basis from user interface. Please also note that **the chosen variable must have values that are coercible to number for each sample** in the data source. A typical pivot variable would be the variable indicating patient's gender.

## 5. Compile the Docker containers

Start compiling the Docker containers and wait for it to complete.

`$ docker-compose build`

## 6. Start the container

Start the previously compiled containers by issuing

`$ docker-compose up`

## 7. Test your installation

If everything went fine and you did not see any error messages, you should now have a running instance. Test it by pointing your browser to `http://localhost:30303` which is the default. If you changed the default port in [step 3](installation.md#web-server-port), change the URL accordingly.

## 8. Additional configuration

### Password-protecting your instance

In certain cases it may be desirable to protect your instance with a username/password combination. To do this, first install `htpasswd` on your operating system, or use a online-generator.

In the `plotter` directory, issue the following command:

`$ htpasswd -c .htpasswd username`.

Replace `username` with a user name of your choosing. Then enter a password you wish to use for the authentication. You can supply additional users by repeating the process without the `c` switch: 

`$ htpasswd .htpasswd another_user`.

Htpasswd then creates a file named `.htpasswd` in the directory. Using a text editor of your choice, open the `python-api/http-docker/nginx.conf` file. There should be three sections that start with the word `location` and enclose settings inside curly brackets. Inside each of these sections add the lines

```
auth_basic "Restricted";
auth_basic_user_file /etc/nginx/.htpasswd;
```

Next, open the file `Dockerfile` in the plotter root directory using a text editor. Look for the line 

```
# Add Nginx configuration
```
After this line, add the line

```
ADD ./.htpasswd /etc/nginx/.htpasswd
```

Test that the instance is password-protected by building the image (as explained in step [5.](installation.md#5-compile-the-docker-containers)) and starting it up.