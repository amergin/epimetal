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

## 4. Add sample file and meta data file

During the compilation phase, Plotter looks for a file `python-api/api-docker/samples.tsv`. This file needs to be a properly formatted tab separated values (TSV) file. The first row indicates the variable names (columns). By default, Plotter assumes the first row contains variables `sampleid` and `datasetname` to uniquely identify each sample. If this is not the case and the variables are named differently, modify `python-api/setup.config`  with a text editor of your choosing and modify the following lines:

```
dataset_identifier=datasetname
sampleid_identifier=sampleid
```

This setup file also contains a row

```
dataset_default=default
```

This tells Plotter to use the name `default` in case the imported samples do not have a variable indicating the dataset name.

### Variable metadata

In order to allow easy search of variables through the UI, Plotter requires meta data to supplied during the compilation phase. Plotter searches for a meta data file that is listed in `python-api/setup.config`:

```
header_file=metabolites_description_160313_lolipop.tsv
```

The meta data file should be a tab-separated values (TSV) file that contains four columns for each variable:

* `name` (Name of the variable)
* `desc` (Description, free text field)
* `unit` (Unit of the variable, e.g. mmmol/l)
* `group` (The variable group under which the variable will grouped in UI and figures)

Note that the order rows in this file is significant. Each variable group and a variable within this group is assigned an ordering number. The first occurence of a variable group in the file determines its order number. The ordering numbers are used in displaying the variable lists in the user interface as well as in arranging the computation results in various figures.

#### Categorical variables

If the variable has discrete value range (i.e. categorical variable), supply the unit in the following format: `C|value1=description|value2=description|...`. For instance, to provide meta data for a variable named `Gender` and the sample value `0` indicates `female` and `1` indicates `male`, and the variable belongs to a group named `Clinical data`, the line would be as follows:

```
Gender  Patient gender  C|0=female|1=male Clinical data
```

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