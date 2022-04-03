cat <<'EOF' | iris session iris -U %SYS
set p("AutheEnabled") = 64
set p("MatchRoles") = ":%All"
do ##class(Security.Applications).Modify("/globals/api", .p)
halt
EOF