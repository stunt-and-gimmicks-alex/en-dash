Docker Standard Compose Structure:

| NAME                         | TYPE                    | REQ  | NOTES                                                                               |
| :--------------------------- | :---------------------- | :--: | :---------------------------------------------------------------------------------- |
| name:                        | string                  | opt  | Name of project                                                                     |
| ─ services:                  | (section)               | req. | Heading for the services section                                                    |
| ─ ─ service_name:            | string                  | req. | Name of service or service group                                                    |
| ─ ─ ─ annotations:           | (section)               | opt. | For making notes and other annotations                                              |
| ─ ─ ─ ─ annotation_key:      | string (value)          | opt. | A kv pair for annotations. Can be array or map                                      |
| ─ ─ ─ attach:                | bool                    | opt. | Only Compose 2.20.0+, determines if Compose collects logs                           |
| ─ ─ ─ build:                 | string **OR** (section) | opt. | Context for building service. Either specify context/file, or hold items w/ context |
| ─ ─ ─ ─ additional_contexts: |                         |      |                                                                                     |
| ─ ─ ─ ─ args:                |                         |      |                                                                                     |
| ─ ─ ─ ─ context:             |                         |      |                                                                                     |
| ─ ─ ─ ─ cache_from:          |                         |      |                                                                                     |
| ─ ─ ─ ─ cache_to:            |                         |      |                                                                                     |
| ─ ─ ─ ─ dockerfile:          |                         |      |                                                                                     |
| ─ ─ ─ ─ dockerfile_inline:   |                         |      |                                                                                     |
| ─ ─ ─ ─ entitlements:        |                         |      |                                                                                     |
| ─ ─ ─ ─ extra_hosts:         |                         |      |                                                                                     |
| ─ ─ ─ ─ isolation:           |                         |      |                                                                                     |
| ─ ─ ─ ─ labels:              |                         |      |                                                                                     |
| ─ ─ ─ ─ network:             |                         |      |                                                                                     |
| ─ ─ ─ ─ no_cache:            |                         |      |                                                                                     |
| ─ ─ ─ ─ platforms:           |                         |      |                                                                                     |
| ─ ─ ─ ─ privileged:          |                         |      |                                                                                     |
| ─ ─ ─ ─ provenance:          |                         |      |                                                                                     |
| ─ ─ ─ ─ pull:                |                         |      |                                                                                     |
| ─ ─ ─ ─ sbom:                |                         |      |                                                                                     |
| ─ ─ ─ ─ secrets:             |                         |      |                                                                                     |
| ─ ─ ─ ─ ssh:                 |                         |      |                                                                                     |
| ─ ─ ─ ─ shm_size:            |                         |      |                                                                                     |
| ─ ─ ─ ─ tags:                |                         |      |                                                                                     |
| ─ ─ ─ ─ target:              |                         |      |                                                                                     |
| ─ ─ ─ ─ ulimits:             |                         |      |                                                                                     |
| ─ ─ ─ blkio_config:          |                         |      |                                                                                     |
| ─ ─ ─ cpu_count:             |                         |      |                                                                                     |
| ─ ─ ─ cpu_percent:           |                         |      |                                                                                     |
| ─ ─ ─ cpu_shares:            |                         |      |                                                                                     |
| ─ ─ ─ cpu_period:            |                         |      |                                                                                     |
| ─ ─ ─ cpu_quota:             |                         |      |                                                                                     |
| ─ ─ ─ cpu_rt_runtime:        |                         |      |                                                                                     |
| ─ ─ ─ cpu_rt_period:         |                         |      |                                                                                     |
| ─ ─ ─ cpus:                  |                         |      |                                                                                     |
| ─ ─ ─ cpuset:                |                         |      |                                                                                     |
| ─ ─ ─ cap_add:               |                         |      |                                                                                     |
| ─ ─ ─ cap_drop:              |                         |      |                                                                                     |
| ─ ─ ─ cgroup:                |                         |      |                                                                                     |
| ─ ─ ─ cgroup_parent:         |                         |      |                                                                                     |
| ─ ─ ─ command:               |                         |      |                                                                                     |
| ─ ─ ─ configs:               |                         |      |                                                                                     |
| ─ ─ ─ container_name:        |                         |      |                                                                                     |
| ─ ─ ─ credential_spec:       |                         |      |                                                                                     |
| ─ ─ ─ depends_on:            |                         |      |                                                                                     |
| ─ ─ ─ deploy:                |                         |      |                                                                                     |
| ─ ─ ─ develop:               |                         |      |                                                                                     |
| ─ ─ ─ device_cgroup_rules:   |                         |      |                                                                                     |
| ─ ─ ─ devices:               |                         |      |                                                                                     |
| ─ ─ ─ dns:                   |                         |      |                                                                                     |
| ─ ─ ─ dns_opt:               |                         |      |                                                                                     |
| ─ ─ ─ dns_search:            |                         |      |                                                                                     |
| ─ ─ ─ domainname:            |                         |      |                                                                                     |
| ─ ─ ─ driver_opts:           |                         |      |                                                                                     |
| ─ ─ ─ entrypoint:            |                         |      |                                                                                     |
| ─ ─ ─ env_file:              |                         |      |                                                                                     |
| ─ ─ ─ environment:           |                         |      |                                                                                     |
| ─ ─ ─ expose:                |                         |      |                                                                                     |
| ─ ─ ─ extends:               |                         |      |                                                                                     |
| ─ ─ ─ external_links:        |                         |      |                                                                                     |
| ─ ─ ─ extra_hosts:           |                         |      |                                                                                     |
| ─ ─ ─ gpus:                  |                         |      |                                                                                     |
| ─ ─ ─ group_add:             |                         |      |                                                                                     |
| ─ ─ ─ healthcheck:           |                         |      |                                                                                     |
| ─ ─ ─ hostname:              |                         |      |                                                                                     |
| ─ ─ ─ image:                 |                         |      |                                                                                     |
| ─ ─ ─ init:                  |                         |      |                                                                                     |
| ─ ─ ─ ipc:                   |                         |      |                                                                                     |
| ─ ─ ─ isolation:             |                         |      |                                                                                     |
| ─ ─ ─ labels:                |                         |      |                                                                                     |
| ─ ─ ─ label_file:            |                         |      |                                                                                     |
| ─ ─ ─ links:                 |                         |      |                                                                                     |
| ─ ─ ─ logging:               |                         |      |                                                                                     |
| ─ ─ ─ mac_address:           |                         |      |                                                                                     |
| ─ ─ ─ mem_limit:             |                         |      |                                                                                     |
| ─ ─ ─ mem_reservation:       |                         |      |                                                                                     |
| ─ ─ ─ mem_swappiness:        |                         |      |                                                                                     |
| ─ ─ ─ memswap_limit:         |                         |      |                                                                                     |
| ─ ─ ─ models:                |                         |      |                                                                                     |
| ─ ─ ─ network_mode:          |                         |      |                                                                                     |
| ─ ─ ─ networks:              |                         |      |                                                                                     |
| ─ ─ ─ interface_name:        |                         |      |                                                                                     |
| ─ ─ ─ oom_kill_disable:      |                         |      |                                                                                     |
| ─ ─ ─ oom_score_adj:         |                         |      |                                                                                     |
| ─ ─ ─ pid:                   |                         |      |                                                                                     |
| ─ ─ ─ pids_limit:            |                         |      |                                                                                     |
| ─ ─ ─ platform:              |                         |      |                                                                                     |
| ─ ─ ─ ports:                 |                         |      |                                                                                     |
| ─ ─ ─ post_start:            |                         |      |                                                                                     |
| ─ ─ ─ pre_stop:              |                         |      |                                                                                     |
| ─ ─ ─ privileged:            |                         |      |                                                                                     |
| ─ ─ ─ profiles:              |                         |      |                                                                                     |
| ─ ─ ─ provider:              |                         |      |                                                                                     |
| ─ ─ ─ pull_policy:           |                         |      |                                                                                     |
| ─ ─ ─ read_only:             |                         |      |                                                                                     |
| ─ ─ ─ restart:               |                         |      |                                                                                     |
| ─ ─ ─ runtime:               |                         |      |                                                                                     |
| ─ ─ ─ scale:                 |                         |      |                                                                                     |
| ─ ─ ─ secrets:               |                         |      |                                                                                     |
| ─ ─ ─ security_opt:          |                         |      |                                                                                     |
| ─ ─ ─ shm_size:              |                         |      |                                                                                     |
| ─ ─ ─ stdin_open:            |                         |      |                                                                                     |
| ─ ─ ─ stop_grace_period:     |                         |      |                                                                                     |
| ─ ─ ─ stop_signal:           |                         |      |                                                                                     |
| ─ ─ ─ storage_opt:           |                         |      |                                                                                     |
| ─ ─ ─ sysctls:               |                         |      |                                                                                     |
| ─ ─ ─ tmpfs:                 |                         |      |                                                                                     |
| ─ ─ ─ tty:                   |                         |      |                                                                                     |
| ─ ─ ─ ulimits:               |                         |      |                                                                                     |
| ─ ─ ─ use_api_socket:        |                         |      |                                                                                     |
| ─ ─ ─ user:                  |                         |      |                                                                                     |
| ─ ─ ─ userns_mode:           |                         |      |                                                                                     |
| ─ ─ ─ uts:                   |                         |      |                                                                                     |
| ─ ─ ─ volumes:               |                         |      |                                                                                     |
| ─ ─ ─ volumes_from:          |                         |      |                                                                                     |

export interface DockerService {  
 name: string; // top-level name of service
annotations: {
note || (null): string;
}
attach: boolean;  
 build: string || {
additional*contexts: {
context: {
key:string || (null);
value: string;
};
};
args: {
key: string || null;
value: string;
};
context: string; // defaults to ( "." )
cache_from: { // syntax follows global format [NAME|type=TYPE[,KEY=VALUE]]
name: string; // list in YAML appears as " - alpine:latest"
types: {
type: string; // always begins with "type=TYPE"; can have args as ",KEY=VALUE", e.g. "type=local,src=path/to/cache"; list in YAML, e.g. " - type=local,src=path/to/cache"
};
};
cache_to: { // syntax follows global format [NAME|type=TYPE[,KEY=VALUE]]
name: string; // list in YAML appears as " - user/app:cache"
types: { // always begins with "type=TYPE"; can have args as ",KEY=VALUE", e.g. "type=local,src=path/to/cache"; list in YAML, e.g. " - type=local,src=path/to/cache"
type: string; // will need to be parsed
value: string;
args: { // will need to be parsed, separator is ","
key: string;
value; string;
}:
};
};
dockerfile: string; // sets alt. Dockerfile, exclusive with dockerfile_inline
dockerfile_inline: string; // use YAML multi-line format, creates inline dockerfile in Compose file, exclusive with dockerfile
entitlements: {
entitlement: string; // defines build priveleged entitlements, list in YAML, e.g. " - network.host"
};
extra_hosts: { // list in YAML, values in quotes, vlaue format ["HOST=ADDRESS"], e.g. " "somehost=162.242.195.82" "
host: {
name: string; // will need to be parsed, seperator is usually "="
address: string;
}
};
isolation: string; // build's platform-specific isolation technology
labels: { // reverse-DNS notation, can be map or list, e.g. " com.example.description: "Accounting webapp" " OR " - "com.example.description=Accounting webapp" "
label: {
name: string; // may need to be parsed if list, separator "="
value: string;
};
};
network: string || { // references Compose "networks" section
network: string; // list in YAML, e.g. " - host"
};
no_cache: boolean;
platforms: { // list in YAML, e.g. " - "linux/amd64" "
platform: string; // in quotes, e.g. " "linux/amd64" "
};
privileged: boolean;
provenance: bollean || {
value: string;
};
pull: string; // reference image, requires full pull even if local image store exists
sbom: boolean || string; // can be true or a string of KV pairs for SBOM generator config
secrets: {
secret: string || { // short and long implementation; short is list of secret names, e.g. " - server-certificate", long is extended format in list, references Compose "secrets:" section
source: string;
target: string;
uid: string; // in quotes, e.g. " "1234" "
gid: string; // in quotes, e.g. " "1234" "
mode: number; // standard permissions format in octal notation
};
};
ssh: string[] || { // list or array notation, e.g. " - default " OR " ssh: ["default"] ", or long version
ssh: string || { // list, e.g. " - default ", may need to be parsed, separator is "="
key: string; // parsed from [KEY=VALUE]
value: string; // parsed from [KEY=VALUE]
};
};
shm_size: int || string; // can be integer representing number of bytes, or byte value, e.g. " 10000 " OR " '2gb' "
tags: { // list of tags, e.g. " - myimage:mytag ", must be associated with the build image
tag: {
key: string; // needs to be parsed from " - [KEY:VALUE] ", separator is ":"
value: string; // needs to be parsed from " - [KEY:VALUE] ", separator is ":"
};
};
target: string; // must be one of the stages defined in multi-stage Dockerfile
ulimits: { // overrides default container ulimits
ulimit: {
name: string;
value: int || { // either an int specifying value, or mapping with soft/hard limits
key: " soft | hard "; // enum of "soft" or "hard"
value: int;
};
};
};
};
blkio_config: {
weight: int;
weight_device: { // list with mappings, e.g. " - path: /some/path"
device: []{
path: string;
weight: int;
};
};
device_read_bps: { // list with mappings, e.g. " - path: /some/path"
device: []{
path: string;
rate: int || string; // int value number of bytes or string expressing byte value, e.g. " 400 " OR " '12mb' "
};
};
device_write_bps: { // list with mappings, e.g. " - path: /some/path"
device: []{
path: string;
rate: int || string; // int value number of bytes or string expressing byte value, e.g. " 400 " OR " '12mb' "
};
};
device_read_iops: { // list with mappings, e.g. " - path: /some/path"
device: []{
path: string;
rate: int; // int value number of operations per second
};
};
device_read_iops: { // list with mappings, e.g. " - path: /some/path"
device: []{
path: string;
rate: int; // int value number of operations per second
};
};
};
cpu_count: int;
cpu_percent: int;
cpu_shares: intl
cpu_period: int;
cpu_quota: int;
cpu_rt_runtime: string; // either int value of microseconds, or duration, e.g. " '9500' " OR " '400ms' "
cpu_rt_period: string; // either int value of microseconds, or duration, e.g. " '9500' " OR " '400ms' "
cpus: number; // fractional number, 0.000 = unlimited
cpuset: string; // can be range or list, e.g. " 0-3 " OR " 0,1,2,3 "
cap_add: []{ // list of strings for additional container capabilities, e.g. " - ALL "
capability: string;
};
cap_drop: []{ // list of strings for container capabilities to drop, e.g. " - NET_ADMIN "
capability: string;
};
cgroup: " host | private";
cgroup_parent: string;
command: null || string || [] { // override container image commands, null is ignored, comand-args can be a single string or list of strings, need to explicitly declare shell if using
command-arg: string;
};
configs: [] { // Pulls configs to allow access to from Project, can be list (short format) or list of objects (long format)
config: string || { // either list of configs to reference from Project, e.g. " - my_config" or list of objects defining configs from Project
source: string; // config name from Project
target: string; // path and name to target file
uid: string; // numerical string for UID of config file owner INSIDE container
gid: string; // numerical string for GID of config file owner INSIDE container
mode: int; // octal number permissions
};
};
container_name: string; // WARNING: Compose will not scale service beyond one container if custom name exists, and will result in error
credential_spec: { // Can be either, if file must be <filename> format, if registry must be <registry-name> format
file: string;
registry: string;
};
depends_on: [] { // can be short (list of strings, e.g. " - db ") or long (mapping of objects), pulls from services in Project, WARNING: ORDER IS IMPORTANT! WILL START IN THIS ORDER!
dependency: string || {
service: string // object name in long format in the YAML, e.g. " db: "
condition: " service_started | service_healthy | service_complete_cuccessfully ";
restart: boolean; // if true, restarts THIS service if dependency updates
required: boolean; // defaults to true - this service won't start until dependency condition is true, if false will give warning but start regardless of dependency condition
};
};
deploy: {}; // I really think we can wait to define this one. The "build" section is already huge. May want to pull "build/deploy/develop" into separate sub interfaces
develop: {}; // same as deploy
device_cgroup_rules: string[];// device cgroup rules for container, in Linux kernel format
devices: []{ // list of strings specifying device in either HOST_PATH:CONTAINER_PATH[:CGROUP_PERMISSIONS] format or as CDI syntax
device: string || { // simple string if in CDI syntax (e.g. ""vendor1.com/device=gpu") or HOST_PATH:CONTAINER_PATH[:CGROUP_PERMISSIONS] format that can be parsed for easier reading
host_path: string; // parsed from HOST_PATH:CONTAINER_PATH[:CGROUP_PERMISSIONS], separator is ":"
container_path: string; // parsed from HOST_PATH:CONTAINER_PATH[:CGROUP_PERMISSIONS], separator is ":"
cgroup_perms: string; // parsed from HOST_PATH:CONTAINER_PATH[:CGROUP_PERMISSIONS], separator is ":", doesn't always exist
};
};
dns: string[]; // list of custom DNS servers on container network interface config, e.g. " - 8.8.8.8 "
dns_opt: string[]; // list of custom DNS options to be passed to container's DNS resolver, e.g. " - use-vc "
dns_search: string || string[]; // custom DNS search domains, can be single value (e.g. " dns_search: example.coom ") or list of domains
domainname: string; // custom domain name for service container, must be RFC 1123
driver_opts: string; // can ignore for now, I think
entrypoint: string || string[]; // container entrypoint that overrides Dockerfile entrypoint, can be value (e.g. "entrypoint: /code/entrypoint.sh") or list of args like Dockerfile (e.g. " - php")
env_file: string || []{ // specifies environmental vars to pass to container, can be short string (e.g. " enf_file: .env "), list of short files (e.g. " - ./a.env ") or long object
env: string || { // env file string name (e.g. " .env " to be written to yaml in list with no key) or object
path: string;
required: boolean;
format: null | "raw" | custom_format_string; // if null uses standard Env_file format, if "raw" handles key=value with no interpolation, or custom format specified
};
};
environment: string[] || { // either a list of strings containing key=value pairs e.g. " - FOO=bar " (should be parsed for display), or map of keys and values
var: {
key: string; // if array, can be parsed from string "key=value", separator is "="
value: string; // if array, can be parsed from string "key=value", separator is "="
};
};
expose: string[]; // list of internally exposed ports from container, in format <portnum>[<protocol>]
extends: {
file: string;
service: string;
};
external_links: string[]; // links services from outside this project, can be service name or aliased as SERVICE:ALIAS
extra_hosts: string[] || { // adds hostname mappings as short format (e.g. " - "somehost=1.1.1.1" ", should be parsed for readability) or as map of host objects
hosts: {
host: string;
address: string;
};
};
gpus: "all" | []{ // equivalent to device request with implicit setting of 'gpu', either all or a list of objects
driver: string;
count: int;
};
group_add: string[];
healthcheck: {
test: string || string[]; // if string, contains implicit "CMD-SHELL", if list first item has to be one of [NONE | CMD | CMD-SHELL]
interval: string; // duration
timeout: string; // duration
retries: int;
start_period: string; // duration
start_interval: string; // duration
};
hostname: string; // must be RFC 1123 hostname
image: string; // string for now, may later parse into components, format as [<registry>/][<project>/]<image>[:<tag>|@<digest>], can be omitted if "build" exists
init: boolean;
ipc: "shareable" | "service:[service name]"; //service name can be specified
isolation: string;
labels: string[] || K:V[]{ // can be list of strings containing "key=value" or map of key: value pairs, should be parsed for readability if list, com.docker.compose cannot be set by user
label: {
key: string;
value: string;
};
};
label_file: string || string[]; // either direc file, e.g. " label_file: ./app.labels " or list of label files, e.g. "label_file: - ./app.labels "
links: string[]; // string can be either just a service or SERVICE:ALIAS
logging: {
driver: string;
options: {
key: string;
value: string;
};
};
mac_address: string;
mem_limit: string; // string expressing byte limit
mem_reservation: string; // string expressing byte limit
mem_swappiness: int; // representing percentage between 0 and 100
memswap_limit: string; // string expressing byte limit OR 0 to ignore OR -1 to unlimited
models: string[] || { // Will become increasingly important, but leave as is for now
model: {
name: string;
endpoint_var: string;
model_var: string;
};
};
network_mode: "none | host | service:{name} | container:{name}";
networks: string[] || {
network: {
name: string;
aleases: string[];
interface_name: string;
ipv4_address: string;
ipv6_address: string;
link_local_ips: string[];
mac_addres: string;
gw_priority: int;
priority: int;
};
};
oom_kill_disable: boolean;
oom_score_adj: int; // must be between -1000 and 1000
pid: string;
pids_limit: int; // -1 for unlimited
platform: string; // in format os[/arch[/variant]] using OCI image spec
ports: string[] || []{ // short form is list of port strings in [[IP:](port | range)](CONTAINER_PORT | CONTAINER_RANGE)[/PROTOCOL], long is list of objects
port: {
name: string;
target: string;
published: string; // can be specific port e.g. "8080" or port range e.g. "8000-9000"
host_ip: string;
protocol: string;
app_protocol: string;
mode: "host | ingress"
};
};
post_start: []{
command: string;
user: string;
privileged: boolean;
working_dir: string;
environment: string[];
};
pre_stop: []{
command: string;
user: string;
privileged: boolean;
working_dir: string;
environment: string[];
};
privileged: boolean;
profiles: string[]; // follows regex format of [a-zA-Z0-9]a-zA-Z0-9*.-]+
provider: {
type: string;
options: {}; // Specific to provider, not validated in Compose, format probably an unlimited number of "key: value" pairs
};
pull*policy: " always | never | missing | build | daily | weekly | every*<duration> " // duration can be expressed as "###(w|d|h|m|s)" or combination
read_only: boolean;
restart: " no | always | on-failure[:max-retries] | unless-stopped ";
runtime: string;
scale: int; // if "replicas" are set in "deploy", has to be consistent
secrets: string[] || [] { // short format is list of strings, long is list of objects
source: string;
target: string;
uid: string; // with surrounding quotes e.g. " "123" "
gid: string; // with surrounding quotes e.g. " "123" "
mode: int; // permissions in in octal form, writeable bit must be ignored
};
security_opt: string[];
shm_size: string; // specified as byte value
stdin_open: boolean;
stop_grace_period: string; // specified as duration
stop_signal: string;
storage_opt: {
size: string; // specified as byte value
};
sysctls: string[] || {}{
key: string;
value: int;
};
tmpfs: string || string[]; // format as <path>[:<mode=value>][,<uid=value>][,<gid=value>]
tty: boolean;
ulimits: {}[]{ // can be either mapping of ulimits e.g. " nproc: 65535 " or mapping of ulimits with soft and hard limit e.g. " nofile: soft:20000 hard:40000 "
name: string;
limit: int || {
soft: int;
hard: int;
};
};
use_api_socket: boolean;
user: string;
userns_mode: string; // value in quotes e.g. " userns_mode: "host" "
uts: string; // value in quotes e.g. " uts: "host" "
volumes: string[] || {}[] { // short format is list of strings e.g. " - something:something:access_mode ", long format is list of objects
type: " volume | bind | tmpfs | image | npipe | cluster ";
source: string; // device source path
target: string; // container destination path
read_only: boolean;
bind: {
nocopy: boolean;
subpath: string;
};
volume: {
nocopy: boolean;
subpath: string;
};
tmpfs: {
size: int || string; // if string, expressed in byte format
mode: int; // Unix permission bits as octal number
}
image: {
subpath: string;
};
consistency: string;
};
volumes_from: string[]; // mount volumes from another service or component, format is [( container | service):](service_name | container_name)[:( ro | rw)]
working_dir: string;
};
